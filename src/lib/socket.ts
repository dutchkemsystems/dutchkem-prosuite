import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

const SOCKET_URL = (import.meta as any).env.VITE_CONVEX_URL
  ? (import.meta as any).env.VITE_CONVEX_URL.replace('http://', 'http://').replace('https://', 'https://')
  : 'http://localhost:3001';

export function useSocket(token: string) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    import('socket.io-client').then(({ io }) => {
      if (cancelled) return;
      const socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));
      socket.on('connect_error', () => setConnected(false));

      socketRef.current = socket;
    });

    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token]);

  return { socket: socketRef.current, connected };
}
