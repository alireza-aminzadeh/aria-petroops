import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { createEquipmentSchema, createTagSchema } from '@aria/contracts';
import { AssetService } from './asset.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth-user';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PoliciesGuard } from '../../common/casl/policies.guard';
import { CheckPolicies } from '../../common/casl/check-policies.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, PoliciesGuard)
export class AssetController {
  constructor(private readonly assets: AssetService) {}

  @Get('sites')
  sites(@CurrentUser() user: AuthUser) {
    return this.assets.sites(user);
  }

  @Get('units')
  units(@CurrentUser() user: AuthUser, @Query('siteId') siteId?: string) {
    return this.assets.units(user, siteId);
  }

  @Get('equipment')
  equipment(@CurrentUser() user: AuthUser, @Query('unitId') unitId?: string) {
    return this.assets.equipment(user, unitId);
  }

  @Post('equipment')
  @Roles('ADMIN', 'PLANNER', 'RELIABILITY_ENGINEER')
  @CheckPolicies((ability) => ability.can('create', 'Equipment'))
  createEquipment(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createEquipmentSchema)) dto: never,
  ) {
    return this.assets.createEquipment(user, dto);
  }

  @Get('tags')
  tags(@CurrentUser() user: AuthUser, @Query('equipmentId') equipmentId?: string) {
    return this.assets.tags(user, equipmentId);
  }

  @Post('tags')
  @Roles('ADMIN', 'PLANNER', 'RELIABILITY_ENGINEER')
  @CheckPolicies((ability) => ability.can('create', 'Tag'))
  createTag(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createTagSchema)) dto: never,
  ) {
    return this.assets.createTag(user, dto);
  }
}
