
import { obtenerSesion, obtenerUsuarios, crearUsuario, borrarUsuario, cerrarSesion } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
    const formUsuario    = document.getElementById('formUsuario');
    const tablaUsuarios  = document.getElementById('tablaUsuarios');
    const userActivoSpan = document.getElementById('usuarioActivo');
    const btnLogout      = document.getElementById('btnLogout');
    const alertAcceso    = document.getElementById('alertAcceso');

    // ── Verificar sesión y rol ────────────────────────────────────────────────
    let sesion;
    try {
        sesion = await obtenerSesion();
    } catch (_) {
        window.location.href = 'login.html';
        return;
    }
    if (!sesion.autenticado) {
        window.location.href = 'login.html';
        return;
    }
    userActivoSpan.textContent = `${sesion.nombre} (${sesion.rol})`;

    if (sesion.rol !== 'admin') {
        if (alertAcceso) {
            alertAcceso.textContent = 'Acceso denegado. Solo los administradores pueden gestionar usuarios.';
            alertAcceso.classList.remove('d-none');
        }
        if (formUsuario) formUsuario.closest('.card').classList.add('d-none');
        return;
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await cerrarSesion();
            window.location.href = 'login.html';
        });
    }

    // ── Validación del formulario ─────────────────────────────────────────────
    const mostrarError = (id, mensaje) => {
        const campo = document.getElementById(id);
        let feedback = campo.nextElementSibling;
        if (!feedback || !feedback.classList.contains('invalid-feedback')) {
            feedback = document.createElement('div');
            feedback.className = 'invalid-feedback';
            campo.parentNode.insertBefore(feedback, campo.nextSibling);
        }
        if (mensaje) {
            campo.classList.add('is-invalid');
            campo.classList.remove('is-valid');
            feedback.textContent = mensaje;
        } else {
            campo.classList.remove('is-invalid');
            campo.classList.add('is-valid');
            feedback.textContent = '';
        }
    };

    const limpiarValidaciones = () => {
        ['nombre', 'email', 'password'].forEach(id => {
            const campo = document.getElementById(id);
            campo.classList.remove('is-invalid', 'is-valid');
        });
    };

    const validarFormulario = () => {
        let valido = true;

        const nombre = document.getElementById('nombre').value.trim();
        if (!nombre) {
            mostrarError('nombre', 'El nombre no puede estar vacío.');
            valido = false;
        } else if (nombre.length < 2) {
            mostrarError('nombre', 'El nombre debe tener al menos 2 caracteres.');
            valido = false;
        } else {
            mostrarError('nombre', '');
        }

        const email = document.getElementById('email').value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            mostrarError('email', 'El email no puede estar vacío.');
            valido = false;
        } else if (!emailRegex.test(email)) {
            mostrarError('email', 'Introduce un email con formato válido.');
            valido = false;
        } else {
            mostrarError('email', '');
        }

        const password = document.getElementById('password').value;
        if (!password) {
            mostrarError('password', 'La contraseña no puede estar vacía.');
            valido = false;
        } else if (password.length < 6) {
            mostrarError('password', 'La contraseña debe tener al menos 6 caracteres.');
            valido = false;
        } else {
            mostrarError('password', '');
        }

        return valido;
    };

    // ── Renderizar tabla de usuarios ──────────────────────────────────────────
    const renderizarTabla = async () => {
        try {
            const usuarios = await obtenerUsuarios();
            tablaUsuarios.innerHTML = '';

            if (usuarios.length === 0) {
                tablaUsuarios.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">No hay usuarios registrados.</td></tr>';
                return;
            }

            usuarios.forEach(u => {
                const fila = document.createElement('tr');
                fila.innerHTML = `
                    <td>${u.nombre}</td>
                    <td>${u.email}</td>
                    <td><span class="badge ${u.rol === 'admin' ? 'bg-danger' : 'bg-secondary'}">${u.rol}</span></td>
                    <td>
                        <button class="btn btn-danger btn-sm btn-borrar" data-email="${u.email}"
                            ${u.email === sesion.email ? 'disabled title="No puedes borrarte a ti mismo"' : ''}>
                            Borrar
                        </button>
                    </td>
                `;
                tablaUsuarios.appendChild(fila);
            });

            document.querySelectorAll('.btn-borrar').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const email = btn.dataset.email;
                    if (!confirm(`¿Seguro que quieres borrar a ${email}?`)) return;
                    try {
                        await borrarUsuario(email);
                        renderizarTabla();
                    } catch (err) {
                        alert('Error al borrar: ' + err.message);
                    }
                });
            });
        } catch (err) {
            tablaUsuarios.innerHTML = `<tr><td colspan="4" class="text-danger">${err.message}</td></tr>`;
        }
    };

    // ── Formulario: dar de alta usuario con validación ────────────────────────
    formUsuario.addEventListener('submit', async (e) => {
        e.preventDefault();
        limpiarValidaciones();

        if (!validarFormulario()) return;

        const nombre   = document.getElementById('nombre').value.trim();
        const email    = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const rol      = document.getElementById('rolUsuario') ? document.getElementById('rolUsuario').value : 'usuario';

        try {
            await crearUsuario(nombre, email, password, rol);
            formUsuario.reset();
            limpiarValidaciones();
            renderizarTabla();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    });

    // Limpiar validaciones al escribir
    ['nombre', 'email', 'password'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            document.getElementById(id).classList.remove('is-invalid', 'is-valid');
        });
    });

    await renderizarTabla();
});
