
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

const usuarioSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, 'El nombre es obligatorio'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'El email es obligatorio'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'El email no tiene un formato válido'],
    },
    password: {
        type: String,
        required: [true, 'La contraseña es obligatoria'],
        minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    },
        rol: {
        type: String,
        enum: {
            values: ['admin', 'usuario'],
            message: 'El rol debe ser "admin" o "usuario"',
        },
        default: 'usuario',
    },
}, { timestamps: true });

usuarioSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    next();
});

usuarioSchema.methods.verificarPassword = function (passwordPlano) {
    return bcrypt.compare(passwordPlano, this.password);
};

module.exports = mongoose.model('Usuario', usuarioSchema);
