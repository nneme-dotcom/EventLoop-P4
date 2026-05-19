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

    // Heatmap de actividad
    const dibujarHeatmap = (empleos) => {
        const grid    = document.getElementById('heatmapGrid');
        const meses   = document.getElementById('heatmapMeses');
        const tooltip = document.getElementById('heatmapTooltip');
        if (!grid) return;

        grid.innerHTML = '';
        meses.innerHTML = '';

        const conteo = {};
        empleos.forEach(e => {
            const dia = e.createdAt ? e.createdAt.slice(0, 10) : null;
            if (dia) conteo[dia] = (conteo[dia] || 0) + 1;
        });

        const hoy = new Date();
        const inicio = new Date(hoy);
        inicio.setMonth(inicio.getMonth() - 5);
        inicio.setDate(1);

        const maxVal = Math.max(...Object.values(conteo), 1);
        const colores = ['#eef4fc', '#b5d4f4', '#378add', '#185fa5', '#042c53'];

        const getColor = (val) => {
            if (!val) return '#f0f0f0';
            return colores[Math.min(Math.floor((val / maxVal) * 5), 4)];
        };

        const dias = [];
        for (let d = new Date(inicio); d <= hoy; d.setDate(d.getDate() + 1)) {
            dias.push(new Date(d));
        }

        const semanas = [];
        let semana = Array(new Date(inicio).getDay()).fill(null);
        dias.forEach(d => {
            semana.push(new Date(d));
            if (semana.length === 7) { semanas.push(semana); semana = []; }
        });
        if (semana.length) { while (semana.length < 7) semana.push(null); semanas.push(semana); }

        const nombresMeses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        let ultimoMes = -1;

        semanas.forEach(sem => {
            const primero = sem.find(d => d !== null);
            const span = document.createElement('span');
            span.style.cssText = 'width:14px;display:inline-block;text-align:left;font-size:11px;';
            if (primero && primero.getMonth() !== ultimoMes) {
                span.textContent = nombresMeses[primero.getMonth()];
                ultimoMes = primero.getMonth();
            }
            meses.appendChild(span);

            const col = document.createElement('div');
            col.style.cssText = 'display:flex;flex-direction:column;gap:3px;';

            sem.forEach(d => {
                const cell = document.createElement('div');
                cell.style.cssText = 'width:14px;height:14px;border-radius:2px;cursor:pointer;';
                if (!d) {
                    cell.style.background = 'transparent';
                } else {
                    const key = d.toISOString().slice(0, 10);
                    const val = conteo[key] || 0;
                    cell.style.background = getColor(val);
                    cell.addEventListener('mouseenter', (e) => {
                        tooltip.style.display = 'block';
                        tooltip.textContent = key + ' — ' + val + (val === 1 ? ' voluntariado' : ' voluntariados');
                    });
                    cell.addEventListener('mousemove', (e) => {
                        tooltip.style.left = (e.clientX + 12) + 'px';
                        tooltip.style.top  = (e.clientY - 30) + 'px';
                    });
                    cell.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
                }
                col.appendChild(cell);
            });
            grid.appendChild(col);
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
            dibujarHeatmap(todosEmpleos);
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
