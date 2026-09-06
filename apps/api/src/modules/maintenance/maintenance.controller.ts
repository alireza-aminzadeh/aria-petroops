import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { createMaintenancePlanSchema } from '@aria/contracts';
import { MaintenanceService } from './maintenance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth-user';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PoliciesGuard } from '../../common/casl/policies.guard';
import { CheckPolicies } from '../../common/casl/check-policies.decorator';

@Controller('maintenance-plans')
@UseGuards(JwtAuthGuard, RolesGuard, PoliciesGuard)
export class MaintenanceController {
  constructor(private readonly service: MaintenanceService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user);
  }

  @Post()
  @Roles('ADMIN', 'PLANNER', 'RELIABILITY_ENGINEER')
  @CheckPolicies((ability) => ability.can('create', 'MaintenancePlan'))
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createMaintenancePlanSchema)) dto: never,
  ) {
    return this.service.create(user, dto);
  }

  @Post(':id/status')
  @Roles('ADMIN', 'PLANNER', 'RELIABILITY_ENGINEER')
  @CheckPolicies((ability) => ability.can('approve', 'MaintenancePlan'))
  transition(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.service.transition(user, id, body.status);
  }

  /**
   * موتور heuristic زمان‌بندی نت/TAR: برنامه‌های تأییدشدهٔ دارای estimatedHours
   * را بین تکنسین‌ها (یا فهرست technicianIds مشخص‌شده) توزیع می‌کند.
   */
  @Post('schedule')
  @Roles('ADMIN', 'PLANNER', 'RELIABILITY_ENGINEER')
  @CheckPolicies((ability) => ability.can('approve', 'MaintenancePlan'))
  schedule(
    @CurrentUser() user: AuthUser,
    @Body()
    body: { horizonStart?: string; technicianIds?: string[]; workingHoursPerDay?: number },
  ) {
    return this.service.schedule(user, body);
  }
}
