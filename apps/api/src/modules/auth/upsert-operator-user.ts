import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  OPERATOR_USERNAME,
  resolveOperatorPassword,
} from './operator-credentials';

const OPERATOR_EMAIL = 'alireza@petro.aria-ai.ir';

export async function upsertOperatorUser(
  prisma: PrismaClient,
  tenantId: string,
): Promise<void> {
  const passwordHash = await bcrypt.hash(resolveOperatorPassword(), 12);
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ username: OPERATOR_USERNAME }, { email: OPERATOR_EMAIL }],
    },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        username: OPERATOR_USERNAME,
        passwordHash,
        roles: ['ADMIN'],
        fullName: 'علیرضا',
      },
    });
    return;
  }

  await prisma.user.create({
    data: {
      tenantId,
      email: OPERATOR_EMAIL,
      username: OPERATOR_USERNAME,
      passwordHash,
      roles: ['ADMIN'],
      fullName: 'علیرضا',
    },
  });
}
