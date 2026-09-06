import { ForbiddenException } from '@nestjs/common';
import { WorkOrderService } from './work-order.service';
import { CaslAbilityFactory } from '../../common/casl/casl-ability.factory';
import { hydrateWorkOrder } from './work-order.runtime';
import { AuthUser } from '../auth/auth-user';

const TENANT = 't1';
const TECH_ASSIGNED = 'tech-assigned';
const TECH_OTHER = 'tech-other';
const PLANNER_ID = 'planner-1';

function user(overrides: Partial<AuthUser>): AuthUser {
  return {
    id: 'u',
    tenantId: TENANT,
    email: 'u@example.com',
    username: 'u',
    fullName: 'User',
    roles: [],
    ...overrides,
  };
}

/** یک WorkOrder را با XState واقعی تا وضعیت «assigned» یا «pendingApproval» جلو می‌برد تا snapshot واقع‌گرایانه بسازد (نه fixture دستی). */
function buildRecord(status: 'assigned' | 'pendingApproval', assignedToId: string | null) {
  const actor = hydrateWorkOrder('wo-1');
  if (assignedToId) {
    actor.send({ type: 'ASSIGN', technicianId: assignedToId });
  }
  if (status === 'pendingApproval') {
    actor.send({ type: 'START' });
    actor.send({ type: 'SUBMIT_FOR_APPROVAL' });
  }
  const snapshot = actor.getPersistedSnapshot();
  actor.stop();
  return {
    id: 'wo-1',
    tenantId: TENANT,
    equipmentId: 'eq-1',
    description: 'test',
    priority: 'medium',
    status,
    assignedToId,
    rejectionReason: null,
    createdById: 'creator-1',
    machineSnapshot: snapshot,
  };
}

function makeService(record: ReturnType<typeof buildRecord>) {
  const updateCalls: unknown[] = [];
  const prisma = {
    workOrder: {
      findFirst: jest.fn(async () => record),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        updateCalls.push(data);
        return { ...record, ...data, equipment: {}, assignedTo: null };
      }),
    },
  };
  const audit = { record: jest.fn(async () => undefined) };
  const service = new WorkOrderService(
    prisma as never,
    audit as never,
    new CaslAbilityFactory(),
  );
  return { service, prisma, audit, updateCalls };
}

describe('WorkOrderService ABAC enforcement (transition)', () => {
  it('allows the technician the WorkOrder is assigned to, to START it', async () => {
    const record = buildRecord('assigned', TECH_ASSIGNED);
    const { service } = makeService(record);

    const result = await service.transition(
      user({ id: TECH_ASSIGNED, roles: ['TECHNICIAN'] }),
      'wo-1',
      { type: 'START' } as never,
    );

    expect(result.status).toBe('inProgress');
  });

  it('rejects a different technician (not assigned) trying to START the same WorkOrder', async () => {
    const record = buildRecord('assigned', TECH_ASSIGNED);
    const { service } = makeService(record);

    await expect(
      service.transition(
        user({ id: TECH_OTHER, roles: ['TECHNICIAN'] }),
        'wo-1',
        { type: 'START' } as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an unassigned technician (assignedToId null) trying to START', async () => {
    const record = buildRecord('assigned', null);
    const { service } = makeService(record);

    await expect(
      service.transition(
        user({ id: TECH_OTHER, roles: ['TECHNICIAN'] }),
        'wo-1',
        { type: 'START' } as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a PLANNER to REJECT a pending-approval WorkOrder (regression: REJECT was missing from the old hardcoded planner list)', async () => {
    const record = buildRecord('pendingApproval', TECH_ASSIGNED);
    const { service } = makeService(record);

    const result = await service.transition(
      user({ id: PLANNER_ID, roles: ['PLANNER'] }),
      'wo-1',
      { type: 'REJECT', reason: 'ناقص است' } as never,
    );

    expect(result.status).toBe('inProgress');
  });

  it('allows a PLANNER to APPROVE a pending-approval WorkOrder', async () => {
    const record = buildRecord('pendingApproval', TECH_ASSIGNED);
    const { service } = makeService(record);

    const result = await service.transition(
      user({ id: PLANNER_ID, roles: ['PLANNER'] }),
      'wo-1',
      { type: 'APPROVE' } as never,
    );

    expect(result.status).toBe('approved');
  });

  it('rejects a TECHNICIAN trying to APPROVE (planner-only action, regardless of assignment)', async () => {
    const record = buildRecord('pendingApproval', TECH_ASSIGNED);
    const { service } = makeService(record);

    await expect(
      service.transition(
        user({ id: TECH_ASSIGNED, roles: ['TECHNICIAN'] }),
        'wo-1',
        { type: 'APPROVE' } as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('ADMIN can perform any transition regardless of assignment', async () => {
    const record = buildRecord('assigned', TECH_OTHER);
    const { service } = makeService(record);

    const result = await service.transition(
      user({ id: 'admin-1', roles: ['ADMIN'] }),
      'wo-1',
      { type: 'START' } as never,
    );

    expect(result.status).toBe('inProgress');
  });
});
