// OASIS - WebSocket Manager (Socket.IO)
// Manages real-time connections for chats and courier GPS tracking

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HTTPServer, allowedOrigins: string[]) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[WS] Cliente conectado: ${socket.id}`);

    // Unirse a una sala específica (sesión de chat o seguimiento de envío)
    socket.on('join_room', (roomId: string) => {
      socket.join(roomId);
      console.log(`[WS] Cliente ${socket.id} se unió a la sala: ${roomId}`);
    });

    // Salir de una sala
    socket.on('leave_room', (roomId: string) => {
      socket.leave(roomId);
      console.log(`[WS] Cliente ${socket.id} salió de la sala: ${roomId}`);
    });

    // Enviar un mensaje de chat en tiempo real
    socket.on('send_message', (data: { sessionId: string; message: any }) => {
      if (io) {
        io.to(data.sessionId).emit('new_message', data.message);
      }
    });

    // Actualización de ubicación GPS por el motorizado
    socket.on('update_location', (data: { driverId: string; latitude: number; longitude: number; speed?: number }) => {
      if (io) {
        // Retransmitir a los clientes que escuchan el rastreo de este repartidor específico
        io.to(`tracking_${data.driverId}`).emit('location_update', data);
        // Retransmitir globalmente para el panel de administración
        io.emit('global_driver_location_update', data);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[WS] Cliente desconectado: ${socket.id} (${reason})`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.IO no ha sido inicializado.');
  }
  return io;
}
