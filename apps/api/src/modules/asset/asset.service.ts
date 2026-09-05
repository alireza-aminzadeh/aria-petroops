import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEquipmentDto, CreateTagDto } from '@aria/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../prisma/audit.service';
import { AuthUser } from '../auth/auth-user';

@Injectable()
export class AssetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  sites(user: AuthUser) {
    return this.prisma.site.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: 'asc' },
    });
  }

  units(user: AuthUser, siteId?: string) {
    return this.prisma.unit.findMany({
      where: {
        site: { tenantId: user.tenantId },
        ...(siteId ? { siteId } : {}),
      },
      include: { site: true },
      orderBy: { name: 'asc' },
    });
  }

  equipment(user: AuthUser, unitId?: string) {
    return this.prisma.equipment.findMany({
      where: {
        unit: { site: { tenantId: user.tenantId } },
        ...(unitId ? { unitId } : {}),
      },
      include: { unit: { include: { site: true } }, tags: true },
      orderBy: { tagNumber: 'asc' },
    });
  }

  async createEquipment(user: AuthUser, dto: CreateEquipmentDto) {
    const unit = await this.prisma.unit.findFirst({
      where: { id: dto.unitId, site: { tenantId: user.tenantId } },
    });
    if (!unit) {
      throw new NotFoundException('واحد فرآیندی یافت نشد.');
    }
    const created = await this.prisma.equipment.create({
      data: {
        unitId: dto.unitId,
        tagNumber: dto.tagNumber,
        name: dto.name,
        equipmentClass: dto.equipmentClass,
        criticality: dto.criticality,
      },
    });
    await this.audit.record({
      tenantId: user.tenantId,
      entity: 'equipment',
      entityId: created.id,
      action: 'CREATE',
      actorId: user.id,
      payload: { tagNumber: dto.tagNumber },
    });
    return created;
  }

  tags(user: AuthUser, equipmentId?: string) {
    return this.prisma.tag.findMany({
      where: {
        equipment: { unit: { site: { tenantId: user.tenantId } } },
        ...(equipmentId ? { equipmentId } : {}),
      },
      include: { equipment: true },
      orderBy: { tagName: 'asc' },
    });
  }

  async createTag(user: AuthUser, dto: CreateTagDto) {
    const equipment = await this.prisma.equipment.findFirst({
      where: {
        id: dto.equipmentId,
        unit: { site: { tenantId: user.tenantId } },
      },
    });
    if (!equipment) {
      throw new NotFoundException('تجهیز یافت نشد.');
    }
    const created = await this.prisma.tag.create({
      data: {
        equipmentId: dto.equipmentId,
        tagName: dto.tagName,
        unitOfMeasure: dto.unitOfMeasure,
        dataType: dto.dataType,
      },
    });
    await this.audit.record({
      tenantId: user.tenantId,
      entity: 'tag',
      entityId: created.id,
      action: 'CREATE',
      actorId: user.id,
      payload: { tagName: dto.tagName },
    });
    return created;
  }
}
