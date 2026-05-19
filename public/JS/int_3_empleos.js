
import { obtenerSesion, obtenerEmpleos, crearEmpleo, borrarEmpleo, cerrarSesion } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
    const form           = document.getElementById('formEmpleo');
    const tabla          = document.getElementById('tablaEmpleos');
    const userActivoSpan = document.getElementById('usuarioActivo');
    const btnLogout      = document.getElementById('btnLogout');
    const canvas         = document.getElementById('graficoEmpleos');
    const ctx            = canvas ? canvas.getContext('2d') : null;
    let chartInstance    = null; // referencia al gráfico Chart.js para destruirlo al actualizar

    // ── Verificar sesión ──────────────────────────────────────────────────────
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
            feedback.textContent = mensaje;
        } else {
            campo.classList.remove('is-invalid');
            campo.classList.add('is-valid');
            feedback.textContent = '';
        }
    };

    const limpiarValidaciones = () => {
        ['titulo', 'emailEmpleo', 'fecha', 'descripcion'].forEach(id => {
            const campo = document.getElementById(id);
            campo.classList.remove('is-invalid', 'is-valid');
        });
    };

    const validarFormulario = () => {
        let valido = true;

        const titulo = document.getElementById('titulo').value.trim();
        if (!titulo) {
            mostrarError('titulo', 'El título no puede estar vacío.');
            valido = false;
        } else if (titulo.length < 3) {
            mostrarError('titulo', 'El título debe tener al menos 3 caracteres.');
            valido = false;
        } else {
            mostrarError('titulo', '');
        }

        const email = document.getElementById('emailEmpleo').value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            mostrarError('emailEmpleo', 'El email no puede estar vacío.');
            valido = false;
        } else if (!emailRegex.test(email)) {
            mostrarError('emailEmpleo', 'Introduce un email válido.');
            valido = false;
        } else {
            mostrarError('emailEmpleo', '');
        }

        const fecha = document.getElementById('fecha').value;
        if (!fecha) {
            mostrarError('fecha', 'La fecha es obligatoria.');
            valido = false;
        } else {
            mostrarError('fecha', '');
        }

        const descripcion = document.getElementById('descripcion').value.trim();
        if (!descripcion) {
            mostrarError('descripcion', 'La descripción no puede estar vacía.');
            valido = false;
        } else if (descripcion.length < 10) {
            mostrarError('descripcion', 'La descripción debe tener al menos 10 caracteres.');
            valido = false;
        } else {
            mostrarError('descripcion', '');
        }

        return valido;
    };

    // ── Heatmap de actividad ──────────────────────────────────────────────────
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
                    cell.addEventListener('mouseenter', () => {
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

    // ── Gráfico dona con Chart.js ─────────────────────────────────────────────
    const dibujarGrafico = (empleos) => {
        if (!canvas) return;
        const ofertas  = empleos.filter(e => e.tipo === 'Oferta').length;
        const demandas = empleos.filter(e => e.tipo === 'Demanda').length;
        const total    = ofertas + demandas;

        // Actualizar contadores bajo el gráfico
        const elTotal    = document.getElementById('statsTotal');
        const elOfertas  = document.getElementById('numOfertas');
        const elDemandas = document.getElementById('numDemandas');
        if (elTotal)    elTotal.textContent    = `Total: ${total}`;
        if (elOfertas)  elOfertas.textContent  = ofertas;
        if (elDemandas) elDemandas.textContent = demandas;

        // Destruir instancia anterior para evitar duplicados al recargar
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }

        // Si no hay datos, mostrar canvas vacío con mensaje
        if (total === 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#adb5bd';
            ctx.font = '13px Segoe UI';
            ctx.textAlign = 'center';
            ctx.fillText('Sin datos aún', canvas.width / 2, canvas.height / 2);
            return;
        }

        chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Ofertas', 'Demandas'],
                datasets: [{
                    data: [ofertas, demandas],
                    backgroundColor: ['#0d6efd', '#ffc107'],
                    borderColor:     ['#0a58ca', '#e0a800'],
                    borderWidth: 2,
                    hoverOffset: 12,
                }],
            },
            options: {
                responsive: true,
                cutout: '65%',   // grosor del anillo
                plugins: {
                    legend: {
                        display: false, // usamos nuestra propia leyenda HTML
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const pct = total > 0
                                    ? ((ctx.parsed / total) * 100).toFixed(1)
                                    : 0;
                                return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
                            },
                        },
                    },
                },
                animation: {
                    animateRotate: true,
                    duration: 600,
                },
            },
        });
    };

    // ── Cargar y renderizar empleos ───────────────────────────────────────────
    const cargarEmpleos = async () => {
        try {
            const empleos = await obtenerEmpleos();
            tabla.innerHTML = '';

            if (empleos.length === 0) {
                tabla.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">No hay voluntariados. Crea el primero.</td></tr>';
            }

            empleos.forEach(e => {
                const fila = document.createElement('tr');
                fila.dataset.id = e.id;
                fila.innerHTML = `
                    <td>${e.titulo}</td>
                    <td><span class="badge ${e.tipo === 'Oferta' ? 'bg-primary' : 'bg-warning text-dark'}">${e.tipo}</span></td>
                    <td>${e.fecha}</td>
                    <td>
                        <button class="btn btn-danger btn-sm btn-borrar" data-id="${e.id}">Borrar</button>
                    </td>
                `;
                tabla.appendChild(fila);
            });

            document.querySelectorAll('.btn-borrar').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (!confirm('¿Seguro que quieres borrar este voluntariado?')) return;
                    try {
                        await borrarEmpleo(btn.dataset.id);
                        cargarEmpleos();
                    } catch (err) {
                        alert('Error al borrar: ' + err.message);
                    }
                });
            });

            dibujarGrafico(empleos);
            dibujarHeatmap(empleos);
        } catch (err) {
            tabla.innerHTML = `<tr><td colspan="4" class="text-danger">${err.message}</td></tr>`;
        }
    };

    // ── Formulario: crear nuevo empleo con validación ─────────────────────────
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        limpiarValidaciones();

        if (!validarFormulario()) return; // detener si hay errores

        try {
            await crearEmpleo({
                titulo:      document.getElementById('titulo').value.trim(),
                email:       document.getElementById('emailEmpleo').value.trim(),
                fecha:       document.getElementById('fecha').value,
                descripcion: document.getElementById('descripcion').value.trim(),
                tipo:        document.getElementById('tipo').value,
            });
            form.reset();
            limpiarValidaciones();
            cargarEmpleos();
        } catch (err) {
            alert('Error al crear voluntariado: ' + err.message);
        }
    });

    // Limpiar validaciones al escribir
    ['titulo', 'emailEmpleo', 'fecha', 'descripcion'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            const campo = document.getElementById(id);
            campo.classList.remove('is-invalid', 'is-valid');
        });
    });

    // ── Socket.io: actualización en tiempo real ───────────────────────────────
    const socket = io({ secure: false });
    socket.on('nuevoEmpleo', () => cargarEmpleos());

    await cargarEmpleos();
});
