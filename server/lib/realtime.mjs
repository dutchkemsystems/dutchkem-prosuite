import { Server } from 'socket.io';
import { jwtVerify } from 'jose';

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

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET_ADMIN || process.env.JWT_SECRET_CLIENT
      );
      const { payload } = await jwtVerify(token, secret);
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
