import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { type ConsumerModel } from '@remoola/database-2';

import { ConsumerDashboardService } from './consumer-dashboard.service';
import { DashboardData } from './dtos/dashboard-data.dto';
import { Identity } from '../../../common';

@ApiTags(`Consumer: Dashboard`)
@Controller(`consumer/dashboard`)
export class ConsumerDashboardController {
  constructor(private readonly dashboard: ConsumerDashboardService) {}

  @Get()
  async getDashboard(@Identity() consumer: ConsumerModel): Promise<DashboardData> {
    return this.dashboard.getDashboardData(consumer.id);
  }
}
