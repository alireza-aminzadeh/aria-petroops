import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: {
    tenantId: string;
    entity: string;
    entityId: string;
    action: string;
    actorId?: string | null;
    payload?: Record<string, unknown>;
  }) {
    const last = await this.prisma.auditLog.findFirst({
      where: { tenantId: params.tenantId },
      orderBy: { id: 'desc' },
      select: { hash: true },
    });

    const prevHash = last?.hash ?? '0'.repeat(64);
    const timestamp = new Date().toISOString();
    const payloadJson = JSON.stringify(params.payload ?? {});
    const material = [
      prevHash,
      params.tenantId,
      params.entity,
      params.entityId,
      params.action,
      params.actorId ?? '',
      payloadJson,
      timestamp,
    ].join('|');

    const hash = createHash('sha256').update(material).digest('hex');

    return this.prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        entity: params.entity,
        entityId: params.entityId,
        action: params.action,
        actorId: params.actorId ?? null,
        payload: (params.payload ?? {}) as Prisma.InputJsonValue,
        prevHash,
        hash,
      },
    });
  }

  async verifyChain(tenantId: string): Promise<{ valid: boolean; brokenAt?: string }> {
    const rows = await this.prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { id: 'asc' },
    });

    let prev = '0'.repeat(64);
    for (const row of rows) {
      if (row.prevHash !== prev) {
        return { valid: false, brokenAt: row.id.toString() };
      }
      prev = row.hash;
    }
    return { valid: true };
  }

  async listForEntity(params: {
    tenantId: string;
    entity: string;
    entityId: string;
  }) {
    const rows = await this.prisma.auditLog.findMany({
      where: {
        tenantId: params.tenantId,
        entity: params.entity,
        entityId: params.entityId,
      },
      orderBy: { id: 'asc' },
    });

    const actorIds = [
      ...new Set(rows.map((row) => row.actorId).filter((id): id is string => Boolean(id))),
    ];
    const actors = actorIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, fullName: true, username: true },
        })
      : [];
    const actorMap = new Map(actors.map((actor) => [actor.id, actor]));

    return rows.map((row) => ({
      id: row.id.toString(),
      action: row.action,
      payload: row.payload,
      hash: row.hash,
      createdAt: row.createdAt,
      actor: row.actorId ? actorMap.get(row.actorId) ?? null : null,
    }));
  }
}
