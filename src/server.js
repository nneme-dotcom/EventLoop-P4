
require('dotenv').config();
const fs            = require('fs');
const path          = require('path');
const https         = require('https');
const express       = require('express');
const session       = require('express-session');
const MongoStore    = require('connect-mongo');
const { graphqlHTTP } = require('express-graphql');
const { Server }    = require('socket.io');

const { conectarDB }      = require('./db');
const schema              = require('./schema');
const { createResolvers } = require('./resolvers');

// ─── Configuración ────────────────────────────────────────────────────────────

const PORT   = process.env.PORT || 4000;
const CERTS  = path.join(__dirname, '..', 'certs');
const KEY_PATH  = path.join(CERTS, 'server.key');
const CERT_PATH = path.join(CERTS, 'server.cert');

// ─── Generar certificado autofirmado si no existe ─────────────────────────────

function generarCertificadoSiNoExiste() {
    if (!fs.existsSync(CERTS)) fs.mkdirSync(CERTS, { recursive: true });

    if (!fs.existsSync(KEY_PATH) || !fs.existsSync(CERT_PATH)) {
        console.log('🔑 Generando certificado TLS autofirmado...');
        const { execSync } = require('child_process');
        try {
            execSync(
                `openssl req -x509 -newkey rsa:2048 -keyout "${KEY_PATH}" -out "${CERT_PATH}" ` +
                `-days 365 -nodes -subj "/CN=localhost"`,
                { stdio: 'pipe' }
            );
            console.log('✅ Certificado generado en /certs/');
        } catch (e) {
            console.warn('⚠️  No se pudo generar certificado con openssl. Revisa que esté instalado.');
            console.warn('   Continuando en HTTP (sin HTTPS).');
        }
    }
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

async function main() {
    // 1. Conectar a MongoDB (Mongoose)
    await conectarDB();

    // 2. Certificado TLS
    generarCertificadoSiNoExiste();

    // 3. App Express
    const app = express();
    app.use(express.json());

    // 4. Sesiones persistidas en MongoDB
    //    - La cookie dura 8 h (resetsOnReload: false para no reiniciar el contador)
    //    - httpOnly: true evita acceso JS a la cookie (XSS mitigation)
    app.use(session({
        secret: process.env.SESSION_SECRET || 'dev_secret_cambia_esto',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGODB_URI,
            dbName:   process.env.MONGODB_DB || 'empleoProDB',
            collectionName: 'sessions',
            ttl: 8 * 60 * 60, // 8 horas en segundos
        }),
        cookie: {
            secure: false,       // false para HTTP en desarrollo
            httpOnly: true,      // inaccesible desde JS del cliente
            sameSite: 'lax',
            maxAge: 8 * 60 * 60 * 1000, // 8 horas en ms
        },
    }));

    // 5. Crear servidor HTTPS (o HTTP de fallback si no hay cert)
    let server;
    const usaHTTPS = fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH);
    if (usaHTTPS) {
        const credentials = {
            key:  fs.readFileSync(KEY_PATH),
            cert: fs.readFileSync(CERT_PATH),
        };
        server = https.createServer(credentials, app);
        console.log('🔒 Servidor configurado con HTTPS');
    } else {
        const http = require('http');
        server = http.createServer(app);
        console.log('⚠️  Servidor configurado con HTTP (sin certificado TLS)');
    }

    // 6. Socket.io sobre el mismo servidor HTTPS
    const io = new Server(server, {
        cors: { origin: '*' },
    });

    // Crear los resolvers inyectando la instancia de Socket.io
    const resolvers = createResolvers(io);

    // 7. Endpoint GraphQL
    //    El contexto pasa req para que los resolvers accedan a req.session
    app.use('/graphql', graphqlHTTP((req) => ({
        schema,
        rootValue: resolvers,
        graphiql: true,
        context: { req },
        customFormatErrorFn: (error) => ({
            message: error.message,
            locations: error.locations,
            path: error.path,
        }),
    })));

    // 8. Archivos estáticos del frontend
    const publicPath = path.join(__dirname, '..', 'public');
    app.use(express.static(publicPath));

    // Ruta raíz → login
    app.get('/', (req, res) => {
        res.redirect('/HTML/login.html');
    });

    // 9. Lógica Socket.io: canal PUB/SUB para el dashboard en tiempo real
    io.on('connection', (socket) => {
        console.log(`🔌 Cliente WebSocket conectado: ${socket.id}`);

        socket.on('disconnect', () => {
            console.log(`🔌 Cliente WebSocket desconectado: ${socket.id}`);
        });
    });

    // 10. Arrancar servidor
    const protocolo = usaHTTPS ? 'https' : 'http';
    server.listen(PORT, () => {
        console.log(`🚀 Servidor EventLoop P4 en ${protocolo}://localhost:${PORT}`);
        console.log(`   GraphiQL: ${protocolo}://localhost:${PORT}/graphql`);
        console.log(`   Frontend: ${protocolo}://localhost:${PORT}/HTML/login.html`);
    });
}

main().catch(err => {
    console.error('Error al arrancar el servidor:', err.message);
    process.exit(1);
});
