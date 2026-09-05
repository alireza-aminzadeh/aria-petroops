import { AuditService } from './audit.service';

describe('AuditService hash chain', () => {
  it('links consecutive records and verifies the chain', async () => {
    const rows: Array<{
      id: bigint;
      prevHash: string;
      hash: string;
      tenantId: string;
    }> = [];

    const prisma = {
      auditLog: {
        findFirst: jest.fn(async () => rows.at(-1) ?? null),
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const row = {
            id: BigInt(rows.length + 1),
            ...data,
          } as (typeof rows)[number];
          rows.push(row);
          return row;
        }),
        findMany: jest.fn(async () => rows),
      },
    };

    const audit = new AuditService(prisma as never);
    await audit.record({
      tenantId: 't1',
      entity: 'work_order',
      entityId: 'wo-1',
      action: 'CREATE',
      actorId: 'u1',
    });
    await audit.record({
      tenantId: 't1',
      entity: 'work_order',
      entityId: 'wo-1',
      action: 'ASSIGN',
      actorId: 'u1',
    });

    expect(rows).toHaveLength(2);
    expect(rows[1].prevHash).toBe(rows[0].hash);
    await expect(audit.verifyChain('t1')).resolves.toEqual({ valid: true });
  });
});
