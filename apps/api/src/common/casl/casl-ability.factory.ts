import { Injectable } from '@nestjs/common';
import {
  AbilityBuilder,
  createMongoAbility,
  ForcedSubject,
  MongoAbility,
} from '@casl/ability';
import { AuthUser } from '../../modules/auth/auth-user';

export type AppAction =
  | 'manage'
  | 'create'
  | 'read'
  | 'approve'
  | 'reject'
  | 'assign'
  | 'close'
  | 'cancel'
  | 'start'
  | 'submit'
  | 'import'
  | 'acknowledge';

/**
 * فیلدهای WorkOrder که شرط‌های ABAC زیر به آن نیاز دارند. WorkOrder واقعی از
 * Prisma فیلدهای بیشتری دارد؛ این فقط زیرمجموعهٔ لازم برای CASL است (کد
 * فراخوان باید instance را با subject('WorkOrder', record) تگ کند، چون
 * Prisma یک plain object برمی‌گرداند نه یک class با __typename).
 */
export type WorkOrderSubjectFields = {
  tenantId: string;
  assignedToId?: string | null;
};

/** «WorkOrder» به‌صورت رشتهٔ نوع (چک سطح-نوع، بدون instance) یا به‌صورت instance تگ‌شده با subject() برای چک ABAC واقعی. */
type WorkOrderSubject = 'WorkOrder' | (WorkOrderSubjectFields & ForcedSubject<'WorkOrder'>);

export type AppSubject =
  | 'all'
  | WorkOrderSubject
  | 'MaintenancePlan'
  | 'Equipment'
  | 'Tag'
  | 'Telemetry'
  | 'AnomalyEvent'
  | 'AlarmEvent'
  | 'Energy';

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
      // ABAC: برنامه‌ریز فقط روی دستورکارهای همین تننت (لایهٔ دوم دفاعی؛
      // لایهٔ اول همان فیلتر tenantId در کوئری findFirst سرویس است که قبل از
      // رسیدن instance به اینجا رد شده).
      can(['assign', 'approve', 'reject', 'close', 'cancel'], 'WorkOrder', {
        tenantId: user.tenantId,
      });
      can('create', 'MaintenancePlan');
      can('approve', 'MaintenancePlan');
      can('create', 'Equipment');
      can('create', 'Tag');
      can('import', 'Telemetry');
      can('acknowledge', 'AnomalyEvent');
    }

    if (user.roles.includes('ENERGY_MANAGER')) {
      can('manage', 'Energy');
    }

    if (user.roles.includes('TECHNICIAN')) {
      // ABAC واقعی (نه صرفاً RBAC): تکنسین فقط می‌تواند روی دستورکاری که
      // *به خودش* تخصیص داده شده START/SUBMIT_FOR_APPROVAL بزند، نه هر
      // دستورکاری در سامانه. قبلاً این شرط اصلاً چک نمی‌شد (فقط نقش بررسی
      // می‌شد) — یعنی هر تکنسینی می‌توانست دستورکار تکنسین دیگر را شروع کند.
      can(['start', 'submit'], 'WorkOrder', {
        tenantId: user.tenantId,
        assignedToId: user.id,
      });
    }

    return build();
  }
}
