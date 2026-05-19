# EventLoop – Producto 4

Aplicación FullStack para la gestión de voluntariados y empleos sociales. Evolución del Producto 3 con backend Node.js + GraphQL, autenticación por roles y comunicación en tiempo real.

## Tecnologías

- **Backend**: Node.js, Express.js, GraphQL (`express-graphql`)
- **Base de datos**: MongoDB Atlas + Mongoose ODM
- **Sesiones**: `express-session` + `connect-mongo`
- **Tiempo real**: Socket.io (PUB/SUB)
- **Seguridad**: HTTPS con certificado autofirmado (OpenSSL), bcrypt
- **Frontend**: HTML5, Bootstrap 5, Fetch API, Chart.js

## Funcionalidades

- Registro e inicio de sesión con roles: `admin` y `usuario`
- CRUD de voluntariados con filtros por tipo (Oferta / Demanda)
- Dashboard con drag & drop bidireccional entre paneles
- Notificaciones en tiempo real vía WebSockets
- Gráfico dona (Chart.js) con estadísticas de voluntariados
- Gestión de usuarios exclusiva para administradores
- Validación de formularios en cliente y servidor

## Instalación

```bash
git clone https://github.com/nneme-dotcom/EventLoop-P4.git
cd EventLoop-P4
npm install
```

Crea un archivo `.env` en la raíz con:

```
MONGODB_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/
MONGODB_DB=empleoProDB
PORT=4000
SESSION_SECRET=cambia_esto
```

## Arranque

```bash
node src/server.js
```

Accede en: `http://localhost:4000`

## Estructura

```
EventLoop-P4/
├── src/
│   ├── server.js        # Entrada principal
│   ├── schema.js        # Esquema GraphQL
│   ├── resolvers.js     # Lógica de negocio
│   ├── db.js            # Conexión Mongoose
│   └── models/          # Usuario, Empleo, Seleccionado
├── public/
│   ├── HTML/            # Vistas (login, dashboard, empleos, usuarios)
│   └── JS/              # Lógica frontend (api.js + interacción por página)
└── .env                 # Variables de entorno (no incluido en repo)
```

## Autores

Grupo EventLoop – DFSSWJS · UOC 2025-2026
