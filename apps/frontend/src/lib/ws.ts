import { io, Socket } from 'socket.io-client';
import { getToken } from './api';

export type TagUpdate = {
  tagId: string;
  tagName?: string;
  value: number;
  timestamp: string;
};

export function connectTelemetry(onUpdate: (payload: TagUpdate) => void): Socket {
  const socket = io('/ws/tags', {
    path: '/socket.io',
    auth: { token: getToken() ?? '' },
    transports: ['websocket', 'polling'],
  });
  socket.on('tag:update', onUpdate);
  return socket;
}
