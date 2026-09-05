import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createActor } from 'xstate';
import { workOrderMachine } from '../src/modules/work-order/work-order.machine';
import { upsertOperatorUser } from '../src/modules/auth/upsert-operator-user';
import { CatalogSyncService } from '../src/modules/asset/catalog-sync.service';
import { parseCsvReadings } from '../src/modules/telemetry/csv-parser';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('ChangeMe!Admin1', 12);

  const tenant = await prisma.tenant.upsert({
    where: { id: '11111111-1111-1111-1111-111111111111' },
    update: {},
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'پالایشگاه نمونه آریا',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@petro.aria-ai.ir' },
    update: { username: 'admin' },
    create: {
      tenantId: tenant.id,
      email: 'admin@petro.aria-ai.ir',
      username: 'admin',
      passwordHash,
      roles: ['ADMIN'],
      fullName: 'مدیر سامانه',
    },
  });

  await prisma.user.upsert({
    where: { email: 'planner@petro.aria-ai.ir' },
    update: { username: 'planner' },
    create: {
      tenantId: tenant.id,
      email: 'planner@petro.aria-ai.ir',
      username: 'planner',
      passwordHash: await bcrypt.hash('ChangeMe!Planner1', 12),
      roles: ['PLANNER'],
      fullName: 'برنامه‌ریز نت',
    },
  });

  const technician = await prisma.user.upsert({
    where: { email: 'tech@petro.aria-ai.ir' },
    update: { username: 'tech' },
    create: {
      tenantId: tenant.id,
      email: 'tech@petro.aria-ai.ir',
      username: 'tech',
      passwordHash: await bcrypt.hash('ChangeMe!Tech1', 12),
      roles: ['TECHNICIAN'],
      fullName: 'تکنسین مکانیک',
    },
  });

  await upsertOperatorUser(prisma, tenant.id);

  const catalog = new CatalogSyncService(prisma);
  await catalog.sync(tenant.id);

  const pump = await prisma.equipment.findUniqueOrThrow({ where: { tagNumber: 'P-101' } });

  const csvPath = join(__dirname, '../fixtures/sample-readings.csv');
  try {
    const rows = parseCsvReadings(readFileSync(csvPath, 'utf8'));
    for (const row of rows) {
      const tag = await prisma.tag.findUnique({ where: { tagName: row.tag_name } });
      if (!tag) continue;
      const time = new Date(row.time);
      await prisma.sensorReading.upsert({
        where: { time_tagId: { time, tagId: tag.id } },
        update: { value: row.value, quality: row.quality ?? 0 },
        create: {
          time,
          tagId: tag.id,
          value: row.value,
          quality: row.quality ?? 0,
        },
      });
    }
  } catch (error) {
    console.warn('Sample telemetry seed skipped:', error);
  }

  const existingWo = await prisma.workOrder.findFirst({
    where: { tenantId: tenant.id, description: { contains: 'نشت آب‌بند' } },
  });

  if (!existingWo) {
    const workOrderId = '44444444-4444-4444-4444-444444444444';
    const actor = createActor(workOrderMachine, { input: { workOrderId } }).start();
    await prisma.workOrder.create({
      data: {
        id: workOrderId,
        tenantId: tenant.id,
        equipmentId: pump.id,
        status: 'draft',
        priority: 'high',
        description: 'بازرسی نشت آب‌بند مکانیکی پمپ P-101',
        createdById: admin.id,
        assignedToId: technician.id,
        machineSnapshot: actor.getPersistedSnapshot() as object,
      },
    });
  }

  await prisma.maintenancePlan.upsert({
    where: { id: '55555555-5555-5555-5555-555555555555' },
    update: {},
    create: {
      id: '55555555-5555-5555-5555-555555555555',
      tenantId: tenant.id,
      equipmentId: pump.id,
      planType: 'PM',
      frequencyDays: 30,
      status: 'approved',
      nextDueAt: new Date('2026-10-01'),
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
