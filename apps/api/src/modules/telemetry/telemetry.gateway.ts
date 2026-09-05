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
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`telemetry client disconnected ${client.id}`);
  }

  broadcastTagUpdate(
    tagId: string,
    value: number,
    timestamp: Date,
    tagName?: string,
  ) {
    const payload = { tagId, tagName, value, timestamp };
    this.server?.emit(`tag:${tagId}`, payload);
    this.server?.emit('tag:update', payload);
  }
}
