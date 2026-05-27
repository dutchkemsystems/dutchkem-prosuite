import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io = null;

export function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(',')
        : ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET_ADMIN || process.env.JWT_SECRET_CLIENT);
      socket.data.userType = payload.type || 'client';
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.data.userType === 'admin') {
      socket.join('admin');
    }
    socket.emit('connected', { timestamp: Date.now() });
  });

  return io;
}

export function broadcast(event, data) {
  if (io) {
    io.to('admin').emit(event, data);
  }
}

export function getIO() {
  return io;
}
