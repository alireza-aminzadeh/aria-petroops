import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { workOrderEventSchema, createWorkOrderSchema } from '@aria/contracts';
import { WorkOrderService } from './work-order.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth-user';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PoliciesGuard } from '../../common/casl/policies.guard';
import { CheckPolicies } from '../../common/casl/check-policies.decorator';

@Controller('work-orders')
@UseGuards(JwtAuthGuard, RolesGuard, PoliciesGuard)
export class WorkOrderController {
  constructor(private readonly service: WorkOrderService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('equipmentId') equipmentId?: string,
  ) {
    return this.service.list(user, status, equipmentId);
  }

  @Get(':id/audit')
  audit(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.auditTrail(user, id);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.get(user, id);
  }

  @Post()
  @Roles('ADMIN', 'PLANNER', 'RELIABILITY_ENGINEER')
  @CheckPolicies((ability) => ability.can('create', 'WorkOrder'))
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createWorkOrderSchema))
    dto: { equipmentId: string; description: string; priority: string },
  ) {
    return this.service.create(user, dto);
  }

  @Post(':id/events')
  sendEvent(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(workOrderEventSchema)) dto: unknown,
  ) {
    return this.service.transition(user, id, dto as never);
  }
}
