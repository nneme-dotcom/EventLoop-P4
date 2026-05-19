import { loguearUsuario, obtenerSesion } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
    const userActivoSpan = document.getElementById('usuarioActivo');
    const loginForm      = document.getElementById('loginForm');
    const errorMsg       = document.getElementById('errorMsg');

    // Comprobar si ya hay sesión activa
    try {
        const sesion = await obtenerSesion();
        if (sesion.autenticado) {
            userActivoSpan.textContent = `${sesion.nombre} (${sesion.rol})`;
            window.location.href = 'dashboard.html';
            return;
        }
    } catch (_) {}

    // Manejar envío del formulario
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMsg.classList.add('d-none');

        const email    = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        try {
            const resultado = await loguearUsuario(email, password);
            if (resultado.ok) {
                userActivoSpan.textContent = `${resultado.nombre} (${resultado.rol})`;
                window.location.href = 'dashboard.html';
            } else {
                errorMsg.textContent = resultado.mensaje || 'Usuario o contraseña incorrectos.';
                errorMsg.classList.remove('d-none');
            }
        } catch (err) {
            errorMsg.textContent = 'Error de conexión: ' + err.message;
            errorMsg.classList.remove('d-none');
        }
    });
});
