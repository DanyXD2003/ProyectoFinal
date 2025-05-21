// controllers/authController.js
const oracledb = require('oracledb');
const db = require('../db.js');


// En authController.js (antes de cualquier operación)
async function testPDB() {
    try {
        const connection = await db.getConnection();
        const result = await connection.execute("SELECT name FROM v$pdbs");
        console.log("PDB conectada:", result.rows);
        await connection.close();
    } catch (err) {
        console.error("Error al verificar PDB:", err);
    }
}
testPDB();

async function login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    try {
        const connection = await db.getConnection();

        const result = await connection.execute(
            `BEGIN
         pkg_login.login_registro(:p_operacion, :p_usuario, :p_clave, :codigo, :mensaje);
       END;`,
            {
                p_operacion: 2, // 2 = login
                p_usuario: email,
                p_clave: password,
                codigo: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                mensaje: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 500 }
            }
        );

        console.log("Resultado del procedimiento:", result.outBinds);
        await connection.commit();
        await connection.close();

        const codigo = result.outBinds.codigo;
        const mensaje = result.outBinds.mensaje;

        // Puedes devolver el mensaje y código tal como lo da Oracle
        if (codigo === 6) {
            res.json({ codigo, mensaje }); // Login exitoso
        } else {
            res.status(401).json({ codigo, mensaje }); // Cualquier otro código
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error en el login', detalle: err.message });
    }
}

async function register(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    try {
        const connection = await db.getConnection();

        const result = await connection.execute(
            `BEGIN
         pkg_login.login_registro(:p_operacion, :p_usuario, :p_clave, :codigo, :mensaje);
       END;`,
            {
                p_operacion: 1, // 1 = registro
                p_usuario: email,
                p_clave: password,
                codigo: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                mensaje: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 500 }
            }
        );
        console.log("Resultado del procedimiento:", result.outBinds);
        await connection.commit();
        await connection.close();

        const codigo = result.outBinds.codigo;
        const mensaje = result.outBinds.mensaje;

        if (codigo === 2) {
            res.json({ codigo, mensaje }); // Registro exitoso
        } else {
            res.status(400).json({ codigo, mensaje }); // Usuario ya existe u otro error
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al registrar', detalle: err.message });
    }

}

// controllers/authController.js

async function recover(req, res) {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
        return res.status(400).json({ error: 'Email, token y nueva contraseña son obligatorios' });
    }

    try {
        const connection = await db.getConnection();

        const result = await connection.execute(
            `BEGIN
         pkg_login.recover_password(:p_usuario, :p_clave, :p_token, :codigo, :mensaje);
       END;`,
            {
                p_usuario: email,
                p_clave: newPassword,
                p_token: token,
                codigo: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                mensaje: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 500 }
            }
        );
        console.log("Resultado del procedimiento:", result.outBinds);
        await connection.commit();
        await connection.close();

        const codigo = result.outBinds.codigo;
        const mensaje = result.outBinds.mensaje;

        if (codigo === 3) {
            res.json({ codigo, mensaje }); // Recuperación exitosa
        } else {
            res.status(400).json({ codigo, mensaje }); // Token inválido, usuario no existe, etc.
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al recuperar contraseña', detalle: err.message });
    }
}

module.exports = {
    login,
    register,
    recover
};
