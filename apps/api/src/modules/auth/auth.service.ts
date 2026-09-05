import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Role } from '@aria/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuthUser } from './auth-user';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const identifier = (dto.username ?? dto.email ?? '').trim().toLowerCase();
    if (!identifier) {
      throw new UnauthorizedException('نام کاربری یا رمز عبور نادرست است.');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier }],
      },
    });
    if (!user) {
      throw new UnauthorizedException('نام کاربری یا رمز عبور نادرست است.');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('نام کاربری یا رمز عبور نادرست است.');
    }

    const roles = (user.roles as Role[]) ?? [];
    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      roles,
    };

    return {
      accessToken: await this.jwt.signAsync(payload),
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        roles,
      },
    };
  }

  me(user: AuthUser) {
    return user;
  }

  listUsers(user: AuthUser) {
    return this.prisma.user.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true, email: true, username: true, fullName: true, roles: true },
      orderBy: { fullName: 'asc' },
    });
  }
}
