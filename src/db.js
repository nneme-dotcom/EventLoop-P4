
require('dotenv').config();
const mongoose = require('mongoose');

async function conectarDB() {
    if (mongoose.connection.readyState >= 1) return; // ya conectado

    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI no definida en .env');

    await mongoose.connect(uri);
    console.log('✅ Mongoose conectado a MongoDB Atlas');
}

module.exports = { conectarDB };
