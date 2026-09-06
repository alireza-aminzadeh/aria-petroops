import { io, Socket } from 'socket.io-client';
import { getToken } from './api';

export type TagUpdate = {
  tagId: string;
  tagName?: string;
  value: number;
  timestamp: string;
};

export type AnomalyUpdate = {
  id: string;
  equipmentId: string | null;
  equipmentTag?: string | null;
  status: string;
  score: number | null;
  summary: string | null;
  detectedAt: string;
};

/**
 * یک سوکت مشترک /ws/tags که هم به‌روزرسانی تگ‌ها و هم رویدادهای آنومالی را
 * پخش می‌کند (Gateway سمت سرور هر دو را روی همین namespace/room تننتی emit
 * می‌کند). onAnomaly اختیاری است تا کدهای موجود که فقط تگ می‌خواهند نشکنند.
 */
export function connectTelemetry(
  onUpdate: (payload: TagUpdate) => void,
  onAnomaly?: (payload: AnomalyUpdate) => void,
): Socket {
  const socket = io('/ws/tags', {
    path: '/socket.io',
    auth: { token: getToken() ?? '' },
    transports: ['websocket', 'polling'],
  });
  socket.on('tag:update', onUpdate);
  if (onAnomaly) {
    socket.on('anomaly:update', onAnomaly);
  }
  return socket;
}
