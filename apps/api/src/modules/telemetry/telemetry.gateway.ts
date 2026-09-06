import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/ws/tags',
  cors: { origin: true },
})
export class TelemetryGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TelemetryGateway.name);

  constructor(private readonly jwt: JwtService) {}

  handleConnection(client: Socket) {
    const token =
      (client.handshake.auth?.token as string | undefined) ||
      String(client.handshake.headers.authorization ?? '').replace(
        /^Bearer\s+/i,
        '',
      );
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = this.jwt.verify<{ sub: string; tenantId: string }>(token);
      client.data.userId = payload.sub;
      client.data.tenantId = payload.tenantId;
      // بدون این room، this.server.emit سراسری بود یعنی داده‌های زنده (تگ‌ها و
      // آنومالی) هر تننت برای کاربران احراز‌هویت‌شدهٔ تننت‌های دیگر هم قابل
      // دیدن بود؛ join کردن به room تننتی، broadcast های زیر را به همان تننت محدود می‌کند.
      void client.join(TelemetryGateway.tenantRoom(payload.tenantId));
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`telemetry client disconnected ${client.id}`);
  }

  broadcastTagUpdate(
    tenantId: string,
    tagId: string,
    value: number,
    timestamp: Date,
    tagName?: string,
  ) {
    const payload = { tagId, tagName, value, timestamp };
    const room = this.server?.to(TelemetryGateway.tenantRoom(tenantId));
    room?.emit(`tag:${tagId}`, payload);
    room?.emit('tag:update', payload);
  }

  /** رویداد باز/به‌روزرسانی/بسته‌شدن آنومالی (Isolation Forest) را فقط به کاربران همان تننت پخش می‌کند. */
  broadcastAnomalyEvent(
    tenantId: string,
    event: {
      id: string;
      equipmentId: string | null;
      equipmentTag?: string | null;
      status: string;
      score: number | null;
      summary: string | null;
      detectedAt: Date;
    },
  ) {
    this.server?.to(TelemetryGateway.tenantRoom(tenantId)).emit('anomaly:update', event);
  }

  private static tenantRoom(tenantId: string): string {
    return `tenant:${tenantId}`;
  }
}
