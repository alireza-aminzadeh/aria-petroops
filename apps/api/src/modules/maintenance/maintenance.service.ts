import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateMaintenancePlanDto } from '@aria/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../prisma/audit.service';
import { AuthUser } from '../auth/auth-user';
import {
  CriticalityLevel,
  SchedulableJob,
  scheduleMaintenanceJobs,
} from './scheduler';

const allowed = ['draft', 'submitted', 'approved', 'rejected'] as const;
const CRITICALITY_LEVELS: readonly CriticalityLevel[] = ['low', 'medium', 'high', 'critical'];

function toCriticalityLevel(value: string | null | undefined): CriticalityLevel {
  return (CRITICALITY_LEVELS as readonly string[]).includes(value ?? '')
    ? (value as CriticalityLevel)
    : 'medium';
}

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(user: AuthUser) {
    return this.prisma.maintenancePlan.findMany({
      where: { tenantId: user.tenantId },
      include: { equipment: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(user: AuthUser, dto: CreateMaintenancePlanDto) {
    this.assertPlanner(user);
    const equipment = await this.prisma.equipment.findFirst({
      where: {
        id: dto.equipmentId,
        unit: { site: { tenantId: user.tenantId } },
      },
    });
    if (!equipment) {
      throw new NotFoundException('تجهیز یافت نشد.');
    }

    const plan = await this.prisma.maintenancePlan.create({
      data: {
        tenantId: user.tenantId,
        equipmentId: dto.equipmentId,
        planType: dto.planType,
        frequencyDays: dto.frequencyDays ?? null,
        nextDueAt: dto.nextDueAt ? new Date(dto.nextDueAt) : null,
        estimatedHours: dto.estimatedHours ?? null,
        status: 'draft',
      },
    });

    await this.audit.record({
      tenantId: user.tenantId,
      entity: 'maintenance_plan',
      entityId: plan.id,
      action: 'CREATE',
      actorId: user.id,
    });

    return plan;
  }

  async transition(user: AuthUser, id: string, status: string) {
    this.assertPlanner(user);
    if (!allowed.includes(status as (typeof allowed)[number])) {
      throw new NotFoundException('وضعیت نامعتبر است.');
    }
    const plan = await this.prisma.maintenancePlan.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!plan) {
      throw new NotFoundException('برنامه نگهداری یافت نشد.');
    }

    const updated = await this.prisma.maintenancePlan.update({
      where: { id },
      data: { status },
    });

    await this.audit.record({
      tenantId: user.tenantId,
      entity: 'maintenance_plan',
      entityId: id,
      action: status.toUpperCase(),
      actorId: user.id,
    });

    return updated;
  }

  /**
   * موتور heuristic زمان‌بندی نت/TAR (scheduler.ts) را روی همهٔ برنامه‌های
   * «approved» با estimatedHours مشخص اجرا می‌کند و assignedToId/scheduledStart/
   * scheduledEnd را می‌نویسد. status برنامه‌ها را عمداً دست‌نخورده می‌گذارد —
   * زمان‌بندی یک عملیات مستقل و قابل‌تکرار (recompute) روی گردش‌کار
   * تأیید/رد موجود است، نه جایگزین آن. اگر تکنسینی مشخص نشود، همهٔ کاربران
   * تننت با نقش TECHNICIAN به‌عنوان منابع در نظر گرفته می‌شوند.
   */
  async schedule(
    user: AuthUser,
    options: { horizonStart?: string; technicianIds?: string[]; workingHoursPerDay?: number } = {},
  ) {
    this.assertPlanner(user);

    const plans = await this.prisma.maintenancePlan.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'approved',
        estimatedHours: { not: null },
      },
      include: { equipment: { select: { tagNumber: true, criticality: true } } },
    });

    if (plans.length === 0) {
      return { scheduled: 0, plans: [] };
    }

    const technicians = await this.prisma.user.findMany({
      where: options.technicianIds?.length
        ? { id: { in: options.technicianIds }, tenantId: user.tenantId }
        : { tenantId: user.tenantId, roles: { array_contains: 'TECHNICIAN' } },
      select: { id: true, fullName: true },
    });

    if (technicians.length === 0) {
      throw new NotFoundException(
        'هیچ تکنسینی برای تخصیص یافت نشد (نقش TECHNICIAN در این تننت یا فهرست technicianIds خالی است).',
      );
    }

    const jobs: SchedulableJob[] = plans.map((plan) => ({
      id: plan.id,
      equipmentTag: plan.equipment.tagNumber,
      criticality: toCriticalityLevel(plan.equipment.criticality),
      estimatedHours: plan.estimatedHours ?? 1,
      dueAt: plan.nextDueAt,
    }));

    const horizonStart = options.horizonStart ? new Date(options.horizonStart) : new Date();
    const assignments = scheduleMaintenanceJobs(
      jobs,
      technicians.map((tech) => ({ id: tech.id, name: tech.fullName })),
      { horizonStart, workingHoursPerDay: options.workingHoursPerDay },
    );

    const updated = [];
    for (const assignment of assignments) {
      const plan = await this.prisma.maintenancePlan.update({
        where: { id: assignment.jobId },
        data: {
          assignedToId: assignment.technicianId,
          scheduledStart: assignment.scheduledStart,
          scheduledEnd: assignment.scheduledEnd,
        },
        include: {
          equipment: { select: { tagNumber: true } },
          assignedTo: { select: { id: true, fullName: true } },
        },
      });
      updated.push(plan);
    }

    await this.audit.record({
      tenantId: user.tenantId,
      entity: 'maintenance_plan',
      entityId: 'batch',
      action: 'SCHEDULE',
      actorId: user.id,
      payload: {
        scheduledCount: updated.length,
        technicianCount: technicians.length,
        horizonStart: horizonStart.toISOString(),
      },
    });

    return { scheduled: updated.length, plans: updated };
  }

  private assertPlanner(user: AuthUser) {
    const ok =
      user.roles.includes('ADMIN') ||
      user.roles.includes('PLANNER') ||
      user.roles.includes('RELIABILITY_ENGINEER');
    if (!ok) {
      throw new ForbiddenException('برای تغییر برنامه نت مجاز نیستید.');
    }
  }
}
