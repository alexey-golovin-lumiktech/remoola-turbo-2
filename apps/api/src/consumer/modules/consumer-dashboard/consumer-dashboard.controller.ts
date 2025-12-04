import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { type ConsumerModel } from '@remoola/database-2';

import { ConsumerDashboardService } from './consumer-dashboard.service';
import { DashboardDataDto } from './dtos/dashboard-data.dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity } from '../../../common';

@ApiTags(`Consumer: Dashboard`)
@Controller(`consumer/dashboard`)
@UseGuards(JwtAuthGuard)
export class ConsumerDashboardController {
  constructor(private readonly dashboard: ConsumerDashboardService) {}

  @Get()
  async getDashboard(@Identity() identity: ConsumerModel): Promise<DashboardDataDto> {
    return this.dashboard.getDashboardData(identity.id);
  }
}
