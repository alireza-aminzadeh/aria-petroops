import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateMaintenancePlanDto } from '@aria/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../prisma/audit.service';
import { AuthUser } from '../auth/auth-user';

const allowed = ['draft', 'submitted', 'approved', 'rejected'] as const;

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
