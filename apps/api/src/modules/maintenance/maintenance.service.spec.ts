import { NotFoundException } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { AuthUser } from '../auth/auth-user';

const TENANT = 't1';

function planner(): AuthUser {
  return {
    id: 'planner-1',
    tenantId: TENANT,
    email: 'p@example.com',
    username: 'p',
    fullName: 'Planner',
    roles: ['PLANNER'],
  };
}

type PlanFixture = {
  id: string;
  tenantId: string;
  estimatedHours: number | null;
  nextDueAt: Date | null;
  status: string;
  equipment: { tagNumber: string; criticality: string };
};

function makeService(plans: PlanFixture[], technicians: { id: string; fullName: string }[]) {
  const updateCalls: Array<{ id: string; data: Record<string, unknown> }> = [];
  const prisma = {
    maintenancePlan: {
      findMany: jest.fn(async () => plans),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        updateCalls.push({ id: where.id, data });
        const plan = plans.find((p) => p.id === where.id)!;
        return {
          ...plan,
          ...data,
          equipment: { tagNumber: plan.equipment.tagNumber },
          assignedTo: technicians.find((t) => t.id === data.assignedToId) ?? null,
        };
      }),
    },
    user: {
      findMany: jest.fn(async () => technicians),
    },
  };
  const audit = { record: jest.fn(async () => undefined) };
  const service = new MaintenanceService(prisma as never, audit as never);
  return { service, prisma, audit, updateCalls };
}

describe('MaintenanceService.schedule (heuristic TAR/PM scheduler integration)', () => {
  it('assigns technicians and persists scheduledStart/scheduledEnd for approved plans with estimatedHours', async () => {
    const plans: PlanFixture[] = [
      {
        id: 'plan-1',
        tenantId: TENANT,
        estimatedHours: 4,
        nextDueAt: new Date('2026-01-01'), // overdue -> highest priority
        status: 'approved',
        equipment: { tagNumber: 'P-101', criticality: 'critical' },
      },
      {
        id: 'plan-2',
        tenantId: TENANT,
        estimatedHours: 2,
        nextDueAt: null,
        status: 'approved',
        equipment: { tagNumber: 'P-102', criticality: 'low' },
      },
    ];
    const technicians = [{ id: 'tech-1', fullName: 'Tech One' }];
    const { service, prisma, audit } = makeService(plans, technicians);

    const result = await service.schedule(planner(), { horizonStart: '2026-09-06T06:00:00.000Z' });

    expect(result.scheduled).toBe(2);
    expect(prisma.maintenancePlan.update).toHaveBeenCalledTimes(2);
    // پلن معوق (plan-1) باید زودتر (در ابتدای افق) زمان‌بندی شود.
    const plan1Update = result.plans.find((p: { id: string }) => p.id === 'plan-1');
    expect(plan1Update).toBeDefined();
    expect(plan1Update?.assignedToId).toBe('tech-1');
    expect(new Date(plan1Update?.scheduledStart as string | Date).toISOString()).toBe(
      '2026-09-06T06:00:00.000Z',
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SCHEDULE', tenantId: TENANT }),
    );
  });

  it('returns scheduled: 0 without querying technicians when there is nothing to schedule', async () => {
    const { service, prisma } = makeService([], []);
    const result = await service.schedule(planner());
    expect(result).toEqual({ scheduled: 0, plans: [] });
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when there are schedulable plans but no technicians available', async () => {
    const plans: PlanFixture[] = [
      {
        id: 'plan-1',
        tenantId: TENANT,
        estimatedHours: 4,
        nextDueAt: null,
        status: 'approved',
        equipment: { tagNumber: 'P-101', criticality: 'medium' },
      },
    ];
    const { service } = makeService(plans, []);
    await expect(service.schedule(planner())).rejects.toBeInstanceOf(NotFoundException);
  });

  it('restricts technician selection to an explicit technicianIds list when provided', async () => {
    const plans: PlanFixture[] = [
      {
        id: 'plan-1',
        tenantId: TENANT,
        estimatedHours: 1,
        nextDueAt: null,
        status: 'approved',
        equipment: { tagNumber: 'P-101', criticality: 'medium' },
      },
    ];
    const technicians = [{ id: 'tech-9', fullName: 'Tech Nine' }];
    const { service, prisma } = makeService(plans, technicians);

    await service.schedule(planner(), { technicianIds: ['tech-9'] });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ['tech-9'] }, tenantId: TENANT }),
      }),
    );
  });
});
