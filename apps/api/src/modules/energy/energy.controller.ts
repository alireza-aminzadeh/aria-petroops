import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth-user';
import { EnergyService } from './energy.service';

@Controller('energy')
@UseGuards(JwtAuthGuard)
export class EnergyController {
  constructor(private readonly energy: EnergyService) {}

  @Get('meters')
  meters(@CurrentUser() user: AuthUser) {
    return this.energy.meters(user);
  }

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUser, @Query('hours') hours?: string) {
    const parsed = hours ? Number(hours) : 24;
    return this.energy.dashboard(user, Number.isFinite(parsed) ? parsed : 24);
  }
}
