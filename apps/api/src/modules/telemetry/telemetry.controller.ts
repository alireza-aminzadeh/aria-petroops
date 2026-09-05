import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CsvImportService } from './csv-import.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth-user';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PoliciesGuard } from '../../common/casl/policies.guard';
import { CheckPolicies } from '../../common/casl/check-policies.decorator';

function sampleCsvPath() {
  const candidates = [
    join(__dirname, '..', '..', '..', 'fixtures', 'sample-readings.csv'),
    join(process.cwd(), 'fixtures', 'sample-readings.csv'),
    join(process.cwd(), 'apps', 'api', 'fixtures', 'sample-readings.csv'),
  ];
  return candidates.find((path) => existsSync(path));
}

@Controller('telemetry')
@UseGuards(JwtAuthGuard, RolesGuard, PoliciesGuard)
export class TelemetryController {
  constructor(private readonly csvImport: CsvImportService) {}

  @Get('sample-csv')
  sampleCsv(@Res() reply: FastifyReply) {
    const path = sampleCsvPath();
    if (!path) {
      throw new BadRequestException('فایل نمونه CSV در دسترس نیست.');
    }
    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="sample-readings.csv"')
      .send(readFileSync(path, 'utf8'));
  }

  @Post('csv-import')
  @Roles('ADMIN', 'PLANNER', 'RELIABILITY_ENGINEER')
  @CheckPolicies((ability) => ability.can('import', 'Telemetry'))
  async importCsv(
    @CurrentUser() user: AuthUser,
    @Req() request: FastifyRequest,
  ) {
    const file = await request.file();
    if (!file) {
      throw new BadRequestException('فایل CSV ارسال نشده است.');
    }
    const buffer = await file.toBuffer();
    return this.csvImport.importCsv(user, buffer.toString('utf8'));
  }

  @Get('readings')
  readings(
    @CurrentUser() user: AuthUser,
    @Query('tagId') tagId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (!tagId) {
      throw new BadRequestException('شناسه تگ الزامی است.');
    }
    return this.csvImport.readings(user, tagId, from, to);
  }
}
