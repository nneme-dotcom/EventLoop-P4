import { obtenerSesion, obtenerEmpleos, obtenerSeleccionados, guardarSeleccion, borrarSeleccion, cerrarSesion } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
    const userActivoSpan          = document.getElementById('usuarioActivo');
    const contenedorTarjetas      = document.getElementById('tarjetas');
    const contenedorSeleccionados = document.getElementById('seleccionados');
    const btnLogout               = document.getElementById('btnLogout');
    const filtroTipo              = document.getElementById('filtroTipo');

    // Verificar sesión
    let sesionActual;
    try {
        sesionActual = await obtenerSesion();
    } catch (_) {
        window.location.href = 'login.html';
        return;
    }
    if (!sesionActual.autenticado) {
        window.location.href = 'login.html';
        return;
    }
    userActivoSpan.textContent = `${sesionActual.nombre} (${sesionActual.rol})`;

    // Logout
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await cerrarSesion();
            window.location.href = 'login.html';
        });
    }

    // Crear tarjeta drag-and-drop
    const crearTarjeta = (empleo, esSeleccionado = false) => {
        const div = document.createElement('div');
        div.className = `card card-empleo shadow-sm mb-2 border-start border-4 ${empleo.tipo === 'Oferta' ? 'border-primary' : 'border-warning'}`;
        div.draggable = true;
        div.id = `empleo-${empleo.id || empleo.empleoId}`;
        div.dataset.tipo = empleo.tipo;
        div.innerHTML = `
            <div class="card-body p-2">
                <div class="d-flex justify-content-between align-items-start">
                    <h6 class="card-title mb-1">${empleo.titulo}</h6>
                    <span class="badge ${empleo.tipo === 'Oferta' ? 'bg-primary' : 'bg-warning text-dark'}">${empleo.tipo}</span>
                </div>
                <p class="small mb-0 text-muted">📅 ${empleo.fecha}</p>
                <p class="small mb-1 text-muted">${empleo.descripcion}</p>
                ${esSeleccionado ? '<span class="badge bg-success">✓ Seleccionado</span>' : ''}
            </div>
        `;

        div.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({ ...empleo, esSeleccionado }));
            div.style.opacity = '0.5';
        });
        div.addEventListener('dragend', () => { div.style.opacity = '1'; });

        return div;
    };

    // Gráfico de actividad
    const canvasActividad = document.getElementById('graficoActividad');
    let chartActividad = null;

    const dibujarGraficoActividad = (empleos, seleccionados) => {
        if (!canvasActividad) return;

        const agruparPorDia = (items, campo) => {
            const conteo = {};
            items.forEach(item => {
                const fecha = item[campo] ? item[campo].slice(0, 10) : null;
                if (!fecha) return;
                conteo[fecha] = (conteo[fecha] || 0) + 1;
            });
            return conteo;
        };

        const empleosPorDia      = agruparPorDia(empleos, 'createdAt');
        const seleccionadosPorDia = agruparPorDia(seleccionados, 'createdAt');

        const todasFechas = [...new Set([
            ...Object.keys(empleosPorDia),
            ...Object.keys(seleccionadosPorDia),
        ])].sort();

        if (chartActividad) { chartActividad.destroy(); chartActividad = null; }

        if (todasFechas.length === 0) return;

        chartActividad = new Chart(canvasActividad.getContext('2d'), {
            type: 'line',
            data: {
                labels: todasFechas,
                datasets: [
                    {
                        label: 'Voluntariados creados',
                        data: todasFechas.map(f => empleosPorDia[f] || 0),
                        borderColor: '#0d6efd',
                        backgroundColor: 'rgba(13,110,253,0.1)',
                        tension: 0.3,
                        fill: true,
                        pointRadius: 4,
                    },
                    {
                        label: 'Selecciones realizadas',
                        data: todasFechas.map(f => seleccionadosPorDia[f] || 0),
                        borderColor: '#ffc107',
                        backgroundColor: 'rgba(255,193,7,0.1)',
                        tension: 0.3,
                        fill: true,
                        pointRadius: 4,
                    },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 },
                    },
                },
            },
        });
    };

    // Estado local
    let todosEmpleos = [];
    let todosSeleccionados = [];

    // Renderizar según filtro activo
    const renderizar = () => {
        const filtro = filtroTipo ? filtroTipo.value : 'Todos';
        contenedorTarjetas.innerHTML = '';
        contenedorSeleccionados.innerHTML = '';

        const idsSeleccionados = todosSeleccionados.map(s => s.empleoId);

        const empleosFiltrados = todosEmpleos.filter(emp => {
            if (filtro !== 'Todos' && emp.tipo !== filtro) return false;
            return !idsSeleccionados.includes(emp.id);
        });

        if (empleosFiltrados.length === 0) {
            contenedorTarjetas.innerHTML = '<p class="text-muted p-3 text-center">No hay voluntariados disponibles.</p>';
        } else {
            empleosFiltrados.forEach(emp => contenedorTarjetas.appendChild(crearTarjeta(emp, false)));
        }

        const seleccionadosFiltrados = todosSeleccionados.filter(s => {
            if (filtro !== 'Todos' && s.tipo !== filtro) return false;
            return true;
        });

        if (seleccionadosFiltrados.length === 0) {
            contenedorSeleccionados.innerHTML = '<p class="text-center text-muted my-auto">Arrastra aquí los voluntariados que te interesen</p>';
        } else {
            seleccionadosFiltrados.forEach(s => contenedorSeleccionados.appendChild(crearTarjeta(s, true)));
        }
    };

    // Cargar datos desde el servidor
    const cargarDashboard = async () => {
        try {
            [todosEmpleos, todosSeleccionados] = await Promise.all([
                obtenerEmpleos(),
                obtenerSeleccionados(),
            ]);
            renderizar();
            dibujarGraficoActividad(todosEmpleos, todosSeleccionados);
        } catch (err) {
            contenedorTarjetas.innerHTML = `<p class="text-danger p-3">Error: ${err.message}</p>`;
        }
    };

    // Filtro de tipo
    if (filtroTipo) {
        filtroTipo.addEventListener('change', renderizar);
    }

    // Drag & Drop → panel DISPONIBLES (devolver seleccionado)
    contenedorTarjetas.addEventListener('dragover', (e) => e.preventDefault());
    contenedorTarjetas.addEventListener('drop', async (e) => {
        e.preventDefault();
        const datos = e.dataTransfer.getData('text/plain');
        if (!datos) return;
        const empleo = JSON.parse(datos);
        if (!empleo.esSeleccionado) return;
        try {
            const empleoId = empleo.empleoId || empleo.id;
            await borrarSeleccion(empleoId);
            await cargarDashboard();
            mostrarToast('↩️ Voluntariado devuelto a disponibles');
        } catch (err) {
            alert('Error al devolver selección: ' + err.message);
        }
    });

    // Drag & Drop → panel SELECCIONADOS
    contenedorSeleccionados.addEventListener('dragover', (e) => e.preventDefault());
    contenedorSeleccionados.addEventListener('drop', async (e) => {
        e.preventDefault();
        const datos = e.dataTransfer.getData('text/plain');
        if (!datos) return;
        const empleo = JSON.parse(datos);
        if (empleo.esSeleccionado) return;
        try {
            await guardarSeleccion({
                empleoId:    empleo.id,
                titulo:      empleo.titulo,
                email:       empleo.email,
                fecha:       empleo.fecha,
                descripcion: empleo.descripcion,
                tipo:        empleo.tipo,
            });
        } catch (err) {
            alert('Error al guardar selección: ' + err.message);
        }
    });

    // WebSocket (Socket.io) para actualizaciones en tiempo real
    const socket = io({ secure: false });

    socket.on('nuevoEmpleo', (empleo) => {
        todosEmpleos.push(empleo);
        renderizar();
        mostrarToast(`📢 Nuevo voluntariado: "${empleo.titulo}"`);
    });

    socket.on('nuevaSeleccion', () => {
        cargarDashboard();
    });

    function mostrarToast(mensaje) {
        const toast = document.getElementById('toastNotificacion');
        const toastBody = document.getElementById('toastBody');
        if (!toast || !toastBody) return;
        toastBody.textContent = mensaje;
        const bsToast = new bootstrap.Toast(toast, { delay: 4000 });
        bsToast.show();
    }

    await cargarDashboard();
});
