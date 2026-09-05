import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthUser } from '../../modules/auth/auth-user';
import { CaslAbilityFactory } from './casl-ability.factory';
import {
  CHECK_POLICIES_KEY,
  PolicyHandler,
} from './check-policies.decorator';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly casl: CaslAbilityFactory,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const handlers =
      this.reflector.get<PolicyHandler[]>(
        CHECK_POLICIES_KEY,
        context.getHandler(),
      ) ?? [];
    if (handlers.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest<{ user: AuthUser }>();
    if (!user) {
      return false;
    }
    const ability = this.casl.createForUser(user);
    return handlers.every((handler) => handler(ability));
  }
}
