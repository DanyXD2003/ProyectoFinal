import oracledb
import mysql.connector
import psycopg2
import json
import os
from datetime import datetime

# Configurar entorno Oracle
os.environ["TNS_ADMIN"] = "/Users/danielelis/Desktop/Dany/Universidad/Mariano/Semestre 7/Bases de datos 2/info proyectofinal/Wallet_ProyectoDB2"
os.environ["ORA_SDTZ"] = "UTC"

# Inicializar cliente Oracle
oracledb.init_oracle_client(
    lib_dir="/Users/danielelis/Desktop/Dany/Universidad/Mariano/Semestre 7/Bases de datos 2/info proyectofinal/instantclient/instantclient_19_19"
)

# ======================== #
# Configuración de conexiones
# ======================== #
ORACLE_CONFIG = {
    "user": "ADMIN",
    "password": "8IHvgWS6q4s37Z7",
    "dsn": "proyectodb2_tp",
    "wallet_location": "/Users/danielelis/Desktop/Dany/Universidad/Mariano/Semestre 7/Bases de datos 2/info proyectofinal/Wallet_ProyectoDB2"
}

MYSQL_CONFIG = {
    "host": "yamanote.proxy.rlwy.net",
    "user": "replicador",
    "password": "Replicador1234",
    "database": "app_db",
    "port": 49101  #
}

POSTGRES_CONFIG = {
    "host": "ep-dark-unit-a59apypi-pooler.us-east-2.aws.neon.tech",
    "user": "replicador",
    "password": "Replicador1234",
    "database": "app_db",
    "port": 5432
}

# ======================== #
# Función principal de replicación
# ======================== #
def replicar_datos():
    oracle_conn = None
    mysql_conn = None
    postgres_conn = None

    try:
        # Conexión a bases de datos
        oracle_conn = oracledb.connect(**ORACLE_CONFIG)
        mysql_conn = mysql.connector.connect(**MYSQL_CONFIG)
        postgres_conn = psycopg2.connect(**POSTGRES_CONFIG)

        oracle_cursor = oracle_conn.cursor()
        mysql_cursor = mysql_conn.cursor()
        postgres_cursor = postgres_conn.cursor()

        # Paso 1: Obtener registros no replicados de Oracle
        oracle_cursor.execute("""
            SELECT bit_id, bit_userId, operacion,
                   bit_log_usuario, bit_clave, bit_token,
                   TO_CHAR(bit_fecha, 'YYYY-MM-DD') as bit_fecha,
                   bit_intentos,
                   TO_CHAR(bit_token_fecha, 'YYYY-MM-DD') as bit_token_fecha,
                   datos_nuevos
            FROM bit_usuario
            WHERE replicado = 0
            ORDER BY bit_id
        """)
        registros = oracle_cursor.fetchall()

        for registro in registros:
            bit_id, bit_userid, operacion, log_usuario, clave, token, \
            fecha, intentos, token_fecha, datos_nuevos = registro

            try:
                # Paso 2: Replicar según tipo de operación
                if operacion == 'IN':
                    # Insertar en MySQL
                    mysql_cursor.execute("""
                        INSERT INTO usuario
                        (userId, log_usuario, clave, token, fecha, intentos, token_fecha)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON DUPLICATE KEY UPDATE
                            log_usuario = VALUES(log_usuario),
                            clave = VALUES(clave),
                            token = VALUES(token),
                            fecha = VALUES(fecha),
                            intentos = VALUES(intentos),
                            token_fecha = VALUES(token_fecha)
                    """, (bit_userid, log_usuario, clave, token, fecha, intentos, token_fecha))

                    # Insertar en PostgreSQL
                    postgres_cursor.execute("""
                        INSERT INTO public.usuario
                        (userId, log_usuario, clave, token, fecha, intentos, token_fecha)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (userId) DO UPDATE SET
                            log_usuario = EXCLUDED.log_usuario,
                            clave = EXCLUDED.clave,
                            token = EXCLUDED.token,
                            fecha = EXCLUDED.fecha,
                            intentos = EXCLUDED.intentos,
                            token_fecha = EXCLUDED.token_fecha
                    """, (bit_userid, log_usuario, clave, token, fecha, intentos, token_fecha))

                elif operacion == 'UP' and datos_nuevos:
                    if isinstance(datos_nuevos, oracledb.LOB):
                        datos_nuevos = datos_nuevos.read()

                    nuevos_datos = json.loads(datos_nuevos)

                    # Construir consulta dinámica con campos del JSON
                    update_fields = []
                    params = []

                    if 'clave' in nuevos_datos:
                        update_fields.append("clave = %s")
                        params.append(nuevos_datos['clave'])

                    if 'token' in nuevos_datos:
                        update_fields.append("token = %s")
                        params.append(nuevos_datos['token'])

                    if 'intentos' in nuevos_datos:
                        update_fields.append("intentos = %s")
                        params.append(nuevos_datos['intentos'])

                    if 'token_fecha' in nuevos_datos:
                        try:
                            token_date = datetime.strptime(nuevos_datos['token_fecha'], '%Y-%m-%d %H:%M:%S')
                            update_fields.append("token_fecha = %s")
                            params.append(token_date)
                        except:
                            pass

                    # Agregar userid para el WHERE
                    params.append(bit_userid)

                    if update_fields:
                        # MySQL
                        mysql_query = f"UPDATE usuario SET {', '.join(update_fields)} WHERE userId = %s"
                        mysql_cursor.execute(mysql_query, params)

                        # PostgreSQL
                        postgres_query = f"UPDATE public.usuario SET {', '.join(update_fields)} WHERE userId = %s"
                        postgres_cursor.execute(postgres_query, params)

                elif operacion == 'DE':
                    # Eliminar en MySQL
                    mysql_cursor.execute("DELETE FROM usuario WHERE userId = %s", (bit_userid,))

                    # Eliminar en PostgreSQL
                    postgres_cursor.execute("DELETE FROM public.usuario WHERE userId = %s", (bit_userid,))

                # Paso 3: Marcar como replicado en Oracle
                oracle_cursor.execute("""
                    UPDATE bit_usuario
                    SET replicado = 1
                    WHERE bit_id = :bit_id
                """, {'bit_id': bit_id})

                # Paso 4: Commit en todas las bases
                mysql_conn.commit()
                postgres_conn.commit()
                oracle_conn.commit()

                print(f"Registro {bit_id} replicado exitosamente")

            except Exception as e:
                # Rollback en caso de error individual
                if mysql_conn:
                    mysql_conn.rollback()
                if postgres_conn:
                    postgres_conn.rollback()
                if oracle_conn:
                    oracle_conn.rollback()

                print(f"Error replicando registro {bit_id}: {str(e)}")
                import traceback
                traceback.print_exc()

    except Exception as e:
        print(f"Error general: {str(e)}")
        import traceback
        traceback.print_exc()

    finally:
        # Cerrar conexiones de forma segura
        try:
            if oracle_conn:
                oracle_conn.close()
        except Exception as e:
            print(f"Error cerrando Oracle: {str(e)}")

        try:
            if mysql_conn:
                mysql_conn.close()
        except Exception as e:
            print(f"Error cerrando MySQL: {str(e)}")

        try:
            if postgres_conn:
                postgres_conn.close()
        except Exception as e:
            print(f"Error cerrando PostgreSQL: {str(e)}")

# Ejecutar replicación
replicar_datos()