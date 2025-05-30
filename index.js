const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const app = express();
const authRoutes = require('./routes/auth');

// Middlewares
app.use(cors());
app.use(express.json());

// Middleware de diagnóstico de solicitudes
app.use((req, res, next) => {
    console.log(`📥 [${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Configurar archivos estáticos
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

// Diagnóstico de archivos estáticos
console.log(`📂 Ruta de archivos estáticos: ${publicPath}`);
console.log("📄 Contenido de public:");
try {
    const files = fs.readdirSync(publicPath);
    files.forEach(file => {
        const fullPath = path.join(publicPath, file);
        const stats = fs.statSync(fullPath);
        console.log(`- ${file} (${stats.isDirectory() ? 'directorio' : 'archivo'})`);
    });
} catch (e) {
    console.error('Error leyendo public:', e);
}

// Servir index.html en la raíz
app.get('/', (req, res) => {
    console.log("📤 Sirviendo index.html");
    res.sendFile(path.join(publicPath, 'index.html'));
});

// Servir recover.html en su ruta específica
app.get('/recover', (req, res) => {
    console.log("📤 Sirviendo recover.html");
    res.sendFile(path.join(publicPath, 'recover.html'));
});

// Rutas de la API
app.use('/api', authRoutes);

// Ruta de diagnóstico
app.get('/diagnostic', (req, res) => {
    res.json({
        status: 'active',
        oracle: 'connected',
        paths: {
            public: publicPath,
            wallet: path.join(__dirname, 'wallet', 'Wallet_ProyectoDB2'),
            instantClient: path.join(__dirname, 'wallet', 'instantclient_19_19')
        }
    });
});

// Manejar rutas no encontradas
app.use((req, res) => {
    console.log(`❌ Ruta no encontrada: ${req.path}`);
    res.status(404).send('Página no encontrada');
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error('🔥 Error:', err.stack);
    res.status(500).send('Algo salió mal!');
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Servidor backend escuchando en http://localhost:${PORT}`);
    console.log(`🔗 Acceso directo a las rutas:`);
    console.log(`   - Login:         http://localhost:${PORT}/`);
    console.log(`   - Recuperación:  http://localhost:${PORT}/recover`);
    console.log(`   - API Login:     http://localhost:${PORT}/api/login`);
    console.log(`   - Diagnóstico:   http://localhost:${PORT}/diagnostic`);
});

// Verificar estado del servidor
server.on('listening', () => {
    console.log('✅ Servidor escuchando correctamente');
});

server.on('error', (error) => {
    console.error('❌ Error en el servidor:', error);
});