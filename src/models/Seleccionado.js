
const mongoose = require('mongoose');

const seleccionadoSchema = new mongoose.Schema({
    empleoId: {
        type: String,
        required: [true, 'El ID del empleo es obligatorio'],
    },
    titulo: { type: String, required: true, trim: true },
    email:  { type: String, required: true, lowercase: true, trim: true },
    fecha:  { type: String, required: true },
    descripcion: { type: String, required: true, trim: true },
    tipo: {
        type: String,
        enum: ['Oferta', 'Demanda'],
        required: true,
    },
        seleccionadoPor: {
        type: String,
        required: [true, 'El campo seleccionadoPor es obligatorio'],
        lowercase: true,
        trim: true,
    },
}, { timestamps: true });

// Índice compuesto: un usuario no puede seleccionar el mismo empleo dos veces
seleccionadoSchema.index({ empleoId: 1, seleccionadoPor: 1 }, { unique: true });

module.exports = mongoose.model('Seleccionado', seleccionadoSchema);
