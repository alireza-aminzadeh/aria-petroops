import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth-user';
import { AlarmQueryService } from './alarm-query.service';

@Controller('alarms')
@UseGuards(JwtAuthGuard)
export class AlarmController {
  constructor(private readonly alarms: AlarmQueryService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('state') state?: string) {
    return this.alarms.list(user, state);
  }

  @Get('kpis')
  kpis(@CurrentUser() user: AuthUser, @Query('hours') hours?: string) {
    const parsed = hours ? Number(hours) : 8;
    return this.alarms.kpis(user, Number.isFinite(parsed) ? parsed : 8);
  }
}
