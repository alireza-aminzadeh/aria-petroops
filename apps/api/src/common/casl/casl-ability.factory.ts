import { Injectable } from '@nestjs/common';
import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
} from '@casl/ability';
import { AuthUser } from '../../modules/auth/auth-user';

export type AppAction =
  | 'manage'
  | 'create'
  | 'read'
  | 'approve'
  | 'assign'
  | 'close'
  | 'cancel'
  | 'start'
  | 'submit'
  | 'import';

export type AppSubject =
  | 'all'
  | 'WorkOrder'
  | 'MaintenancePlan'
  | 'Equipment'
  | 'Tag'
  | 'Telemetry';

export type AppAbility = MongoAbility<[AppAction, AppSubject]>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: AuthUser): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    can('read', 'all');

    if (user.roles.includes('ADMIN')) {
      can('manage', 'all');
      return build();
    }

    const planner =
      user.roles.includes('PLANNER') ||
      user.roles.includes('RELIABILITY_ENGINEER');

    if (planner) {
      can('create', 'WorkOrder');
      can('assign', 'WorkOrder');
      can('approve', 'WorkOrder');
      can('close', 'WorkOrder');
      can('cancel', 'WorkOrder');
      can('create', 'MaintenancePlan');
      can('approve', 'MaintenancePlan');
      can('create', 'Equipment');
      can('create', 'Tag');
      can('import', 'Telemetry');
    }

    if (user.roles.includes('TECHNICIAN')) {
      can('start', 'WorkOrder');
      can('submit', 'WorkOrder');
    }

    return build();
  }
}
