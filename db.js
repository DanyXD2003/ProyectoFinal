const oracledb = require('oracledb');
const path = require('path');
const fs = require('fs');

// Configurar rutas - ACTUALIZADO A VERSIÓN 23.3
const WALLET_DIR = path.join(__dirname, 'wallet', 'Wallet_ProyectoDB2');
const INSTANT_CLIENT_DIR = path.join(__dirname, 'wallet', 'instantclient_19_19');

// Diagnóstico de rutas
console.log("🔍 Ruta completa del wallet:", WALLET_DIR);
console.log("🔍 Ruta completa de Instant Client:", INSTANT_CLIENT_DIR);

// Configurar entorno
process.env.TNS_ADMIN = WALLET_DIR;
process.env.ORA_SDTZ = 'UTC';

// Inicializar cliente Oracle
try {
    oracledb.initOracleClient({
        libDir: INSTANT_CLIENT_DIR,
        configDir: WALLET_DIR,
        driverName: 'oracledb-thin'
    });
    console.log("✅ Cliente Oracle inicializado correctamente");
} catch (err) {
    console.error("❌ Error al inicializar cliente Oracle:", err.message);
}

// Configuración de conexión simplificada
const dbConfig = {
    user: "ADMIN",
    password: "8IHvgWS6q4s37Z7",
    connectString: "proyectodb2_tp",
    walletLocation: WALLET_DIR
};

// Función getConnection optimizada
async function getConnection() {
    try {
        console.log("🔑 Conectando a Oracle...");
        const connection = await oracledb.getConnection(dbConfig);
        console.log("✅ Conexión exitosa a Oracle ATP");

        // Verificación rápida
        const result = await connection.execute("SELECT 1 FROM DUAL");
        console.log("🔍 Prueba de conexión exitosa:", result.rows);

        return connection;
    } catch (err) {
        console.error("❌ Error al conectar a Oracle ATP:", err);

        // Diagnóstico de archivos del wallet
        console.log("\n🔍 Contenido del wallet:");
        try {
            const files = fs.readdirSync(WALLET_DIR);
            files.forEach(file => console.log(`- ${file}`));
        } catch (e) {
            console.error("Error leyendo wallet:", e);
        }

        // Diagnóstico de tnsnames.ora
        console.log("\n🔍 Contenido de tnsnames.ora:");
        try {
            const tnsContent = fs.readFileSync(path.join(WALLET_DIR, 'tnsnames.ora'), 'utf8');
            console.log(tnsContent);
        } catch (e) {
            console.error("Error leyendo tnsnames.ora:", e);
        }

        // Limpiar caché
        try {
            const cacheFiles = fs.readdirSync(WALLET_DIR).filter(f => f.startsWith('.oracle_'));
            if (cacheFiles.length > 0) {
                console.log("⚠️ Se encontraron archivos de caché. Eliminando...");
                cacheFiles.forEach(f => {
                    fs.unlinkSync(path.join(WALLET_DIR, f));
                    console.log(`🗑️ Eliminado: ${f}`);
                });
            }
        } catch (e) {
            console.error("Error limpiando caché:", e);
        }

        throw err;
    }
}

module.exports = { getConnection };