// OASIS - Backend Server Entry Point
// Starts the Next.js framework server and integrates Socket.IO for WebSockets

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initSocket } from './lib/socket';

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '8000', 10);
const hostname = 'localhost';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url || '', true);
    handle(req, res, parsedUrl);
  });

  // Configuración de orígenes permitidos desde variables de entorno
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000'];

  // Inicializar el servidor Socket.IO integrado
  initSocket(httpServer, allowedOrigins);

  httpServer.listen(port, () => {
    console.log(`\n=============================================================`);
    console.log(`🟢 Servidor de Oasis Nicaragua activo en http://localhost:${port}`);
    console.log(`🟢 Modo: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🟢 WebSockets (Socket.IO) listos en el mismo puerto.`);
    console.log(`=============================================================\n`);
  });
}).catch((err) => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});
