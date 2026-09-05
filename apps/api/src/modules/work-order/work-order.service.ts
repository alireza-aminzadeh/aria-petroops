import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { WorkOrderEventDto } from '@aria/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../prisma/audit.service';
import { AuthUser } from '../auth/auth-user';
import { hydrateWorkOrder, availableEvents } from './work-order.runtime';
import { WorkOrderEvent } from './work-order.machine';

@Injectable()
export class WorkOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(user: AuthUser, status?: string, equipmentId?: string) {
    return this.prisma.workOrder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(status ? { status } : {}),
        ...(equipmentId ? { equipmentId } : {}),
      },
      include: {
        equipment: true,
        assignedTo: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(user: AuthUser, id: string) {
    const record = await this.prisma.workOrder.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        equipment: true,
        assignedTo: { select: { id: true, fullName: true, email: true } },
      },
    });
    if (!record) {
      throw new NotFoundException('دستور کار یافت نشد.');
    }
    return {
      ...record,
      availableEvents: availableEvents(record.id, record.machineSnapshot),
    };
  }

  async create(
    user: AuthUser,
    dto: { equipmentId: string; description: string; priority: string },
  ) {
    const equipment = await this.prisma.equipment.findFirst({
      where: {
        id: dto.equipmentId,
        unit: { site: { tenantId: user.tenantId } },
      },
    });
    if (!equipment) {
      throw new NotFoundException('تجهیز یافت نشد.');
    }

    const created = await this.prisma.workOrder.create({
      data: {
        tenantId: user.tenantId,
        equipmentId: dto.equipmentId,
        description: dto.description,
        priority: dto.priority,
        createdById: user.id,
        status: 'draft',
      },
    });

    const actor = hydrateWorkOrder(created.id);
    const persisted = await this.prisma.workOrder.update({
      where: { id: created.id },
      data: {
        machineSnapshot: actor.getPersistedSnapshot() as Prisma.InputJsonValue,
      },
    });
    actor.stop();

    await this.audit.record({
      tenantId: user.tenantId,
      entity: 'work_order',
      entityId: persisted.id,
      action: 'CREATE',
      actorId: user.id,
      payload: { equipmentId: dto.equipmentId, priority: dto.priority },
    });

    return persisted;
  }

  async transition(user: AuthUser, id: string, dto: WorkOrderEventDto) {
    const record = await this.prisma.workOrder.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!record) {
      throw new NotFoundException('دستور کار یافت نشد.');
    }

    this.assertCanSend(user, dto.type);

    const event = dto as WorkOrderEvent;
    const actor = hydrateWorkOrder(record.id, record.machineSnapshot);

    if (!actor.getSnapshot().can(event)) {
      actor.stop();
      throw new UnprocessableEntityException(
        'این گذار در وضعیت فعلی مجاز نیست.',
      );
    }

    actor.send(event);
    const snapshot = actor.getSnapshot();
    const persisted = actor.getPersistedSnapshot();
    actor.stop();

    const updated = await this.prisma.workOrder.update({
      where: { id: record.id },
      data: {
        status: String(snapshot.value),
        machineSnapshot: persisted as Prisma.InputJsonValue,
        assignedToId:
          dto.type === 'ASSIGN' ? dto.technicianId : record.assignedToId,
        rejectionReason:
          dto.type === 'REJECT' ? dto.reason : record.rejectionReason,
      },
      include: {
        equipment: true,
        assignedTo: { select: { id: true, fullName: true, email: true } },
      },
    });

    await this.audit.record({
      tenantId: user.tenantId,
      entity: 'work_order',
      entityId: record.id,
      action: dto.type,
      actorId: user.id,
      payload: dto,
    });

    return {
      ...updated,
      availableEvents: availableEvents(updated.id, updated.machineSnapshot),
    };
  }

  async auditTrail(user: AuthUser, id: string) {
    const record = await this.prisma.workOrder.findFirst({
      where: { id, tenantId: user.tenantId },
      select: { id: true },
    });
    if (!record) {
      throw new NotFoundException('دستور کار یافت نشد.');
    }
    return this.audit.listForEntity({
      tenantId: user.tenantId,
      entity: 'work_order',
      entityId: id,
    });
  }

  private assertCanSend(user: AuthUser, type: WorkOrderEvent['type']) {
    if (user.roles.includes('ADMIN')) {
      return;
    }
    const planner =
      user.roles.includes('PLANNER') ||
      user.roles.includes('RELIABILITY_ENGINEER');
    const plannerEvents: WorkOrderEvent['type'][] = [
      'ASSIGN',
      'APPROVE',
      'CLOSE',
      'CANCEL',
    ];
    const technicianEvents: WorkOrderEvent['type'][] = [
      'START',
      'SUBMIT_FOR_APPROVAL',
    ];
    if (plannerEvents.includes(type) && planner) {
      return;
    }
    if (technicianEvents.includes(type) && user.roles.includes('TECHNICIAN')) {
      return;
    }
    throw new ForbiddenException('برای این گذار مجاز نیستید.');
  }
}
