
const mongoose = require('mongoose');

const empleoSchema = new mongoose.Schema({
    titulo: {
        type: String,
        required: [true, 'El título es obligatorio'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'El email de contacto es obligatorio'],
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'El email no tiene un formato válido'],
    },
    fecha: {
        type: String,
        required: [true, 'La fecha es obligatoria'],
    },
    descripcion: {
        type: String,
        required: [true, 'La descripción es obligatoria'],
        trim: true,
    },
    tipo: {
        type: String,
        enum: {
            values: ['Oferta', 'Demanda'],
            message: 'El tipo debe ser "Oferta" o "Demanda"',
        },
        required: [true, 'El tipo es obligatorio'],
    },
        creadoPor: {
        type: String,
        lowercase: true,
        trim: true,
        default: 'admin',
    },
}, { timestamps: true });

module.exports = mongoose.model('Empleo', empleoSchema);
