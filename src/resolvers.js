
const Usuario     = require('./models/Usuario');
const Empleo      = require('./models/Empleo');
const Seleccionado = require('./models/Seleccionado');

// ─── Helpers de sesión ───────────────────────────────────────────────────────

function getSesion(req) {
    return req.session && req.session.usuario ? req.session.usuario : null;
}

function requireAuth(req) {
    if (!getSesion(req)) throw new Error('No autenticado. Por favor inicia sesión.');
}

function requireAdmin(req) {
    requireAuth(req);
    if (getSesion(req).rol !== 'admin') {
        throw new Error('Acceso denegado. Se requiere rol de administrador.');
    }
}

// ─── Fábrica de resolvers ────────────────────────────────────────────────────

function createResolvers(io) {
    return {

        // =====================================================================
        // QUERIES
        // =====================================================================

                obtenerSesion: (args, { req }) => {
            const sesion = getSesion(req);
            if (!sesion) return { autenticado: false, nombre: null, email: null, rol: null };
            return { autenticado: true, nombre: sesion.nombre, email: sesion.email, rol: sesion.rol };
        },

                obtenerUsuarios: async (args, { req }) => {
            requireAdmin(req);
            const usuarios = await Usuario.find().select('-password');
            return usuarios.map(u => ({
                id: u._id,
                nombre: u.nombre,
                email: u.email,
                rol: u.rol,
            }));
        },

                obtenerEmpleos: async (args, { req }) => {
            requireAuth(req);
            const sesion = getSesion(req);
            const filtro = sesion.rol === 'admin' ? {} : { creadoPor: sesion.email };
            const empleos = await Empleo.find(filtro).sort({ createdAt: -1 });
            return empleos.map(e => ({
                id: e._id,
                titulo: e.titulo,
                email: e.email,
                fecha: e.fecha,
                descripcion: e.descripcion,
                tipo: e.tipo,
                creadoPor: e.creadoPor,
            }));
        },

                obtenerSeleccionados: async (args, { req }) => {
            requireAuth(req);
            const sesion = getSesion(req);
            const filtro = sesion.rol === 'admin' ? {} : { seleccionadoPor: sesion.email };
            const seleccionados = await Seleccionado.find(filtro).sort({ createdAt: -1 });
            return seleccionados.map(s => ({
                id: s._id,
                empleoId: s.empleoId,
                titulo: s.titulo,
                email: s.email,
                fecha: s.fecha,
                descripcion: s.descripcion,
                tipo: s.tipo,
                seleccionadoPor: s.seleccionadoPor,
            }));
        },

        // =====================================================================
        // MUTATIONS – SESIÓN
        // =====================================================================

                loguearUsuario: async ({ email, password }, { req }) => {
            if (!email || !password) throw new Error('Email y contraseña son obligatorios.');
            try {
                const usuario = await Usuario.findOne({ email: email.toLowerCase() });
                if (!usuario) return { ok: false, nombre: null, rol: null, mensaje: 'Usuario no encontrado.' };

                const coincide = await usuario.verificarPassword(password);
                if (!coincide) return { ok: false, nombre: null, rol: null, mensaje: 'Contraseña incorrecta.' };

                // Guardar sesión en servidor
                req.session.usuario = {
                    nombre: usuario.nombre,
                    email: usuario.email,
                    rol: usuario.rol,
                };

                return { ok: true, nombre: usuario.nombre, rol: usuario.rol, mensaje: 'Login correcto.' };
            } catch (err) {
                throw new Error('Error al iniciar sesión: ' + err.message);
            }
        },

                cerrarSesion: (args, { req }) => {
            return new Promise((resolve, reject) => {
                req.session.destroy(err => {
                    if (err) reject(new Error('Error al cerrar sesión: ' + err.message));
                    else resolve(true);
                });
            });
        },

        // =====================================================================
        // MUTATIONS – USUARIOS
        // =====================================================================

                crearUsuario: async ({ nombre, email, password, rol }, { req }) => {
            // Si se intenta crear un admin, hay que ser admin (excepto si no existe ninguno aún)
            if (rol === 'admin') {
                const totalAdmins = await Usuario.countDocuments({ rol: 'admin' });
                if (totalAdmins > 0) requireAdmin(req);
            }

            try {
                const usuario = new Usuario({
                    nombre: nombre.trim(),
                    email: email.toLowerCase().trim(),
                    password,                  // el hook pre-save lo hashea
                    rol: rol || 'usuario',
                });
                await usuario.save();
                return { id: usuario._id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol };
            } catch (err) {
                // Mongoose lanza código 11000 en clave duplicada
                if (err.code === 11000) throw new Error('El email ya está registrado.');
                throw new Error('Error al crear usuario: ' + err.message);
            }
        },

                borrarUsuario: async ({ email }, { req }) => {
            requireAdmin(req);
            const resultado = await Usuario.deleteOne({ email: email.toLowerCase() });
            return resultado.deletedCount === 1;
        },

        // =====================================================================
        // MUTATIONS – EMPLEOS
        // =====================================================================

                crearEmpleo: async ({ titulo, email, fecha, descripcion, tipo }, { req }) => {
            requireAuth(req);
            const sesion = getSesion(req);

            try {
                const empleo = new Empleo({
                    titulo: titulo.trim(),
                    email: email.toLowerCase().trim(),
                    fecha,
                    descripcion: descripcion.trim(),
                    tipo,
                    creadoPor: sesion.email,
                });
                await empleo.save();

                const payload = {
                    id: empleo._id,
                    titulo: empleo.titulo,
                    email: empleo.email,
                    fecha: empleo.fecha,
                    descripcion: empleo.descripcion,
                    tipo: empleo.tipo,
                    creadoPor: empleo.creadoPor,
                };

                // 🔴 PUB/SUB: notifica a todos los clientes conectados vía WebSocket
                io.emit('nuevoEmpleo', payload);

                return payload;
            } catch (err) {
                throw new Error('Error al crear empleo: ' + err.message);
            }
        },

                actualizarEmpleo: async ({ id, titulo, email, fecha, descripcion, tipo }, { req }) => {
            requireAuth(req);
            const sesion = getSesion(req);

            const empleo = await Empleo.findById(id);
            if (!empleo) throw new Error('Empleo no encontrado.');

            if (sesion.rol !== 'admin' && empleo.creadoPor !== sesion.email) {
                throw new Error('No tienes permiso para editar este empleo.');
            }

            if (titulo)      empleo.titulo      = titulo.trim();
            if (email)       empleo.email       = email.toLowerCase().trim();
            if (fecha)       empleo.fecha       = fecha;
            if (descripcion) empleo.descripcion = descripcion.trim();
            if (tipo)        empleo.tipo        = tipo;

            await empleo.save();

            return {
                id: empleo._id,
                titulo: empleo.titulo,
                email: empleo.email,
                fecha: empleo.fecha,
                descripcion: empleo.descripcion,
                tipo: empleo.tipo,
                creadoPor: empleo.creadoPor,
            };
        },

                borrarEmpleo: async ({ id }, { req }) => {
            requireAuth(req);
            const sesion = getSesion(req);

            const empleo = await Empleo.findById(id);
            if (!empleo) return false;

            if (sesion.rol !== 'admin' && empleo.creadoPor !== sesion.email) {
                throw new Error('No tienes permiso para borrar este empleo.');
            }

            await Empleo.deleteOne({ _id: id });
            return true;
        },

        // =====================================================================
        // MUTATIONS – SELECCIONADOS
        // =====================================================================

                guardarSeleccion: async ({ empleoId, titulo, email, fecha, descripcion, tipo }, { req }) => {
            requireAuth(req);
            const sesion = getSesion(req);

            try {
                const seleccionado = await Seleccionado.findOneAndUpdate(
                    { empleoId, seleccionadoPor: sesion.email },
                    { empleoId, titulo, email, fecha, descripcion, tipo, seleccionadoPor: sesion.email },
                    { upsert: true, new: true, runValidators: true }
                );

                const payload = {
                    id: seleccionado._id,
                    empleoId: seleccionado.empleoId,
                    titulo: seleccionado.titulo,
                    email: seleccionado.email,
                    fecha: seleccionado.fecha,
                    descripcion: seleccionado.descripcion,
                    tipo: seleccionado.tipo,
                    seleccionadoPor: seleccionado.seleccionadoPor,
                };

                // 🔴 PUB/SUB: notifica a todos los clientes que hay una nueva selección
                io.emit('nuevaSeleccion', payload);

                return payload;
            } catch (err) {
                throw new Error('Error al guardar selección: ' + err.message);
            }
        },

                borrarSeleccion: async ({ empleoId }, { req }) => {
            requireAuth(req);
            const sesion = getSesion(req);
            const resultado = await Seleccionado.deleteOne({
                empleoId,
                seleccionadoPor: sesion.email,
            });
            return resultado.deletedCount === 1;
        },
    };
}

module.exports = { createResolvers };
