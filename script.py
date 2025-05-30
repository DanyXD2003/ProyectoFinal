import oracledb
import mysql.connector
import psycopg2
import json
import os
import pathlib
import logging
from datetime import datetime

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)

# Obtener ruta base del proyecto
BASE_DIR = pathlib.Path(__file__).parent.resolve()

# Configurar rutas para Oracle
WALLET_DIR = BASE_DIR / "wallet" / "Wallet_ProyectoDB2"
INSTANT_CLIENT_DIR = BASE_DIR / "wallet" / "instantclient_19_19"

# Configurar entorno Oracle
os.environ["TNS_ADMIN"] = str(WALLET_DIR)
os.environ["ORA_SDTZ"] = "UTC"

# Inicializar cliente Oracle
try:
    oracledb.init_oracle_client(lib_dir=str(INSTANT_CLIENT_DIR))
    logging.info("Cliente Oracle inicializado correctamente")
except Exception as e:
    logging.error(f"Error inicializando cliente Oracle: {str(e)}")
    exit(1)

# Configuración de conexiones
ORACLE_CONFIG = {
    "user": "ADMIN",
    "password": "8IHvgWS6q4s37Z7",
    "dsn": "proyectodb2_tp",
    "wallet_location": str(WALLET_DIR)
}

MYSQL_CONFIG = {
    "host": "yamanote.proxy.rlwy.net",
    "user": "replicador",
    "password": "Replicador1234",
    "database": "app_db",
    "port": 49101
}

POSTGRES_CONFIG = {
    "host": "ep-dark-unit-a59apypi-pooler.us-east-2.aws.neon.tech",
    "user": "replicador",
    "password": "Replicador1234",
    "database": "app_db",
    "port": 5432
}

def diagnosticar_oracle():
    """Diagnóstico detallado de la conexión Oracle"""
    try:
        # Conexión especial para diagnóstico
        with oracledb.connect(**ORACLE_CONFIG) as conn:
            with conn.cursor() as cursor:
                # Verificar registros no replicados con bloqueo
                cursor.execute("""
                    SELECT bit_id, bit_userId, operacion, bit_log_usuario
                    FROM bit_usuario
                    WHERE replicado = 0
                    ORDER BY bit_id
                """)
                registros = cursor.fetchall()

                if registros:
                    logging.info(f"Registros no replicados encontrados: {len(registros)}")
                    for r in registros:
                        logging.info(f"  - ID: {r[0]}, UserID: {r[1]}, Operación: {r[2]}, Usuario: {r[3]}")
                else:
                    logging.warning("No se encontraron registros no replicados")

                    # Verificar si hay registros en la tabla
                    cursor.execute("SELECT COUNT(*) FROM bit_usuario")
                    total = cursor.fetchone()[0]
                    logging.info(f"Total de registros en bit_usuario: {total}")

                    # Verificar el último registro insertado
                    cursor.execute("""
                        SELECT bit_id, bit_log_usuario, fecha, replicado
                        FROM bit_usuario
                        ORDER BY bit_id DESC
                        FETCH FIRST 1 ROW ONLY
                    """)
                    ultimo = cursor.fetchone()
                    if ultimo:
                        logging.info(f"Último registro: ID={ultimo[0]}, Usuario={ultimo[1]}, Fecha={ultimo[2]}, Replicado={ultimo[3]}")

                return True
    except Exception as e:
        logging.error(f"Error en diagnóstico Oracle: {str(e)}")
        return False

def replicar_datos():
    oracle_conn = None
    mysql_conn = None
    postgres_conn = None
    processed_count = 0

    try:
        # Conexión a bases de datos
        logging.info("Conectando a Oracle...")
        oracle_conn = oracledb.connect(**ORACLE_CONFIG)
        oracle_conn.autocommit = False

        oracle_cursor = oracle_conn.cursor()

        logging.info("Conectando a MySQL...")
        mysql_conn = mysql.connector.connect(**MYSQL_CONFIG)
        mysql_conn.autocommit = False

        logging.info("Conectando a PostgreSQL...")
        postgres_conn = psycopg2.connect(**POSTGRES_CONFIG)
        postgres_conn.autocommit = False

        # Paso 1: Obtener registros no replicados
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
        total_records = len(registros)
        logging.info(f"Registros a replicar: {total_records}")

        if total_records == 0:
            logging.warning("No hay registros para replicar")
            return

        for registro in registros:
            bit_id, bit_userid, operacion, log_usuario, clave, token, \
            fecha, intentos, token_fecha, datos_nuevos = registro

            try:
                logging.info(f"Procesando registro {bit_id} ({operacion})")

                # Paso 2: Replicar según tipo de operación
                if operacion == 'IN':
                    # Insertar en MySQL
                    mysql_cursor = mysql_conn.cursor()
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
                    mysql_cursor.close()

                    # Insertar en PostgreSQL
                    postgres_cursor = postgres_conn.cursor()
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
                    postgres_cursor.close()

                elif operacion == 'UP' and datos_nuevos:
                    # Convertir datos si es necesario
                    if hasattr(datos_nuevos, 'read'):
                        datos_nuevos = datos_nuevos.read()

                    if isinstance(datos_nuevos, bytes):
                        datos_nuevos = datos_nuevos.decode('utf-8')

                    try:
                        nuevos_datos = json.loads(datos_nuevos)
                    except:
                        logging.error(f"Error decodificando JSON para registro {bit_id}")
                        continue

                    # Construir consulta dinámica
                    update_fields = []
                    params = []

                    for field in ['clave', 'token', 'intentos']:
                        if field in nuevos_datos:
                            update_fields.append(f"{field} = %s")
                            params.append(nuevos_datos[field])

                    if 'token_fecha' in nuevos_datos:
                        try:
                            token_date = datetime.strptime(nuevos_datos['token_fecha'], '%Y-%m-%d %H:%M:%S')
                            update_fields.append("token_fecha = %s")
                            params.append(token_date)
                        except:
                            pass

                    if update_fields:
                        params.append(bit_userid)

                        # MySQL
                        mysql_cursor = mysql_conn.cursor()
                        mysql_query = f"UPDATE usuario SET {', '.join(update_fields)} WHERE userId = %s"
                        mysql_cursor.execute(mysql_query, params)
                        mysql_cursor.close()

                        # PostgreSQL
                        postgres_cursor = postgres_conn.cursor()
                        postgres_query = f"UPDATE public.usuario SET {', '.join(update_fields)} WHERE userId = %s"
                        postgres_cursor.execute(postgres_query, params)
                        postgres_cursor.close()

                elif operacion == 'DE':
                    # Eliminar en MySQL
                    mysql_cursor = mysql_conn.cursor()
                    mysql_cursor.execute("DELETE FROM usuario WHERE userId = %s", (bit_userid,))
                    mysql_cursor.close()

                    # Eliminar en PostgreSQL
                    postgres_cursor = postgres_conn.cursor()
                    postgres_cursor.execute("DELETE FROM public.usuario WHERE userId = %s", (bit_userid,))
                    postgres_cursor.close()

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

                processed_count += 1
                logging.info(f"Registro {bit_id} replicado exitosamente")

            except Exception as e:
                logging.error(f"Error replicando registro {bit_id}: {str(e)}")
                # Rollback en caso de error individual
                mysql_conn.rollback()
                postgres_conn.rollback()
                oracle_conn.rollback()

        logging.info(f"Proceso completado. Registros procesados: {processed_count}/{total_records}")

    except Exception as e:
        logging.error(f"Error general: {str(e)}")
        # Rollback general si hay error
        if oracle_conn:
            oracle_conn.rollback()
        if mysql_conn:
            mysql_conn.rollback()
        if postgres_conn:
            postgres_conn.rollback()
    finally:
        # Cerrar conexiones de forma segura
        for conn in [oracle_conn, mysql_conn, postgres_conn]:
            if conn:
                try:
                    conn.close()
                except:
                    pass

if __name__ == "__main__":
    logging.info("====== INICIANDO PROCESO DE REPLICACIÓN ======")

    # Ejecutar diagnóstico
    diagnosticar_oracle()

    # Ejecutar replicación
    replicar_datos()

    logging.info("====== REPLICACIÓN COMPLETADA ======")