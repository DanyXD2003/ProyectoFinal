const express = require('express');
const path = require('path');
const cors = require('cors'); // Instálalo con: npm install cors
const app = express();
const authRoutes = require('./routes/auth');

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Sirve archivos estáticos desde "public"

// Ruta para la raíz
//app.get('/', (req, res) => {
//    res.sendFile(path.join(__dirname, 'public', 'index.html'));
//});

// Rutas de la API
app.use('/api', authRoutes);

app.listen(3000, () => {
    console.log('Servidor backend escuchando en http://localhost:3000');
});