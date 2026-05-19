// api.js — Módulo de comunicación con el backend GraphQL.
// Sustituye a almacenaje.js: en vez de localStorage e IndexedDB,
// cada función hace un fetch POST al endpoint GraphQL del servidor.
// La sesión la gestiona el servidor mediante express-session + cookie httpOnly.

const GRAPHQL_URL = `${window.location.protocol}//${window.location.host}/graphql`;

async function gql(query, variables = {}) {
    const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const json = await res.json();
    if (json.errors && json.errors.length > 0) throw new Error(json.errors[0].message);

    return json.data;
}

// ── Sesión ────────────────────────────────────────────────────────────────────

export async function obtenerSesion() {
    const data = await gql(`
        query {
            obtenerSesion {
                autenticado
                nombre
                email
                rol
            }
        }
    `);
    return data.obtenerSesion;
}

export async function loguearUsuario(email, password) {
    const data = await gql(`
        mutation Login($email: String!, $password: String!) {
            loguearUsuario(email: $email, password: $password) {
                ok
                nombre
                rol
                mensaje
            }
        }
    `, { email, password });
    return data.loguearUsuario;
}

export async function cerrarSesion() {
    const data = await gql(`mutation { cerrarSesion }`);
    return data.cerrarSesion;
}

// ── Usuarios ──────────────────────────────────────────────────────────────────

export async function obtenerUsuarios() {
    const data = await gql(`
        query {
            obtenerUsuarios {
                id
                nombre
                email
                rol
            }
        }
    `);
    return data.obtenerUsuarios;
}

export async function crearUsuario(nombre, email, password, rol = 'usuario') {
    const data = await gql(`
        mutation Crear($nombre: String!, $email: String!, $password: String!, $rol: String) {
            crearUsuario(nombre: $nombre, email: $email, password: $password, rol: $rol) {
                id
                nombre
                email
                rol
            }
        }
    `, { nombre, email, password, rol });
    return data.crearUsuario;
}

export async function borrarUsuario(email) {
    const data = await gql(`
        mutation Borrar($email: String!) {
            borrarUsuario(email: $email)
        }
    `, { email });
    return data.borrarUsuario;
}

// ── Empleos ───────────────────────────────────────────────────────────────────

export async function obtenerEmpleos() {
    const data = await gql(`
        query {
            obtenerEmpleos {
                id
                titulo
                email
                fecha
                descripcion
                tipo
                creadoPor
            }
        }
    `);
    return data.obtenerEmpleos;
}

export async function crearEmpleo({ titulo, email, fecha, descripcion, tipo }) {
    const data = await gql(`
        mutation Crear($titulo: String!, $email: String!, $fecha: String!, $descripcion: String!, $tipo: String!) {
            crearEmpleo(titulo: $titulo, email: $email, fecha: $fecha, descripcion: $descripcion, tipo: $tipo) {
                id
                titulo
                email
                fecha
                descripcion
                tipo
                creadoPor
            }
        }
    `, { titulo, email, fecha, descripcion, tipo });
    return data.crearEmpleo;
}

export async function borrarEmpleo(id) {
    const data = await gql(`
        mutation Borrar($id: ID!) {
            borrarEmpleo(id: $id)
        }
    `, { id });
    return data.borrarEmpleo;
}

// ── Seleccionados ─────────────────────────────────────────────────────────────

export async function obtenerSeleccionados() {
    const data = await gql(`
        query {
            obtenerSeleccionados {
                id
                empleoId
                titulo
                email
                fecha
                descripcion
                tipo
                seleccionadoPor
            }
        }
    `);
    return data.obtenerSeleccionados;
}

export async function guardarSeleccion({ empleoId, titulo, email, fecha, descripcion, tipo }) {
    const data = await gql(`
        mutation Guardar($empleoId: String!, $titulo: String!, $email: String!, $fecha: String!, $descripcion: String!, $tipo: String!) {
            guardarSeleccion(empleoId: $empleoId, titulo: $titulo, email: $email, fecha: $fecha, descripcion: $descripcion, tipo: $tipo) {
                id
                empleoId
                titulo
                email
                fecha
                descripcion
                tipo
                seleccionadoPor
            }
        }
    `, { empleoId, titulo, email, fecha, descripcion, tipo });
    return data.guardarSeleccion;
}

export async function borrarSeleccion(empleoId) {
    const data = await gql(`
        mutation Borrar($empleoId: String!) {
            borrarSeleccion(empleoId: $empleoId)
        }
    `, { empleoId });
    return data.borrarSeleccion;
}
