
const { buildSchema } = require('graphql');

module.exports = buildSchema(`

  type Usuario {
    id: ID
    nombre: String
    email: String
    rol: String
  }

  type Empleo {
    id: ID
    titulo: String
    email: String
    fecha: String
    descripcion: String
    tipo: String
    creadoPor: String
  }

  type Seleccionado {
    id: ID
    empleoId: String
    titulo: String
    email: String
    fecha: String
    descripcion: String
    tipo: String
    seleccionadoPor: String
  }

  type SesionResult {
    ok: Boolean
    nombre: String
    rol: String
    mensaje: String
  }

  type SesionInfo {
    autenticado: Boolean
    nombre: String
    email: String
    rol: String
  }

  type Query {
    # Devuelve info de la sesión activa en servidor (express-session)
    obtenerSesion: SesionInfo

    # Admin: todos los usuarios | usuario normal: error de permisos
    obtenerUsuarios: [Usuario]

    # Admin: todos los empleos | usuario normal: solo los suyos
    obtenerEmpleos: [Empleo]

    # Admin: todos los seleccionados | usuario normal: solo los suyos
    obtenerSeleccionados: [Seleccionado]
  }

  type Mutation {
    # Registrar nuevo usuario (rol por defecto: "usuario")
    crearUsuario(nombre: String!, email: String!, password: String!, rol: String): Usuario

    # Solo admin puede borrar usuarios
    borrarUsuario(email: String!): Boolean

    # Login: crea sesión en servidor
    loguearUsuario(email: String!, password: String!): SesionResult

    # Logout: destruye sesión en servidor
    cerrarSesion: Boolean

    # Admin puede crear cualquier empleo; usuario normal crea con su email
    crearEmpleo(titulo: String!, email: String!, fecha: String!, descripcion: String!, tipo: String!): Empleo

    actualizarEmpleo(id: ID!, titulo: String, email: String, fecha: String, descripcion: String, tipo: String): Empleo

    # Admin puede borrar cualquier empleo; usuario solo los suyos
    borrarEmpleo(id: ID!): Boolean

    # Guardar selección (upsert por empleoId + usuario)
    guardarSeleccion(empleoId: String!, titulo: String!, email: String!, fecha: String!, descripcion: String!, tipo: String!): Seleccionado

    borrarSeleccion(empleoId: String!): Boolean
  }
`);
