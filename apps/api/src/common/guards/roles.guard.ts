import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@aria/contracts';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUser } from '../../modules/auth/auth-user';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest<{ user: AuthUser }>();
    if (!user) {
      return false;
    }
    if (user.roles.includes('ADMIN')) {
      return true;
    }
    return required.some((role) => user.roles.includes(role));
  }
}
