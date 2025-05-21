// db.js
process.env.TNS_ADMIN = "/Users/danielelis/Desktop/Dany/Universidad/Mariano/Semestre 7/Bases de datos 2/info proyectofinal/Wallet_ProyectoDB2";
const oracledb = require("oracledb");
const fs = require("fs");
const path = require("path");

// Ruta al directorio del Wallet (ajusta según tu proyecto)
const walletPath = path.resolve(__dirname, "wallet");

const dbConfig = {
    user: "ADMIN", // Usuario de la base de datos
    password: "8IHvgWS6q4s37Z7", // Contraseña del usuario ADMIN
    connectString: `proyectodb2_tp`,
    walletLocation: path.resolve(__dirname, "/Users/danielelis/Desktop/Dany/Universidad/Mariano/Semestre 7/Bases de datos 2/info proyectofinal/Wallet_ProyectoDB2"), // Ruta al Wallet
};

// Inicializa el cliente de Oracle
oracledb.initOracleClient({ libDir: "/Users/danielelis/Desktop/Dany/Universidad/Mariano/Semestre 7/Bases de datos 2/info proyectofinal/instantclient/instantclient_19_19" });

oracledb.autoCommit = false; // Desactiva el autocommit
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.errorOnAutoCommit = true;

async function getConnection() {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        return connection;
    } catch (err) {
        console.error("Error al conectar a Oracle ATP:", err);
        throw err;
    }
}

module.exports = { getConnection };