import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { consumerDashboardDataSchema, type ConsumerDashboardData } from '@remoola/api-types';
import { type ConsumerModel } from '@remoola/database-2';

import { ConsumerDashboardService } from './consumer-dashboard.service';
import { Identity } from '../../../common';
import { toConsumerWireContract } from '../../consumer-wire-contract';

@ApiTags(`Consumer: Dashboard`)
@Controller(`consumer/dashboard`)
export class ConsumerDashboardController {
  constructor(private readonly dashboard: ConsumerDashboardService) {}

  @Get()
  async getDashboard(@Identity() consumer: ConsumerModel): Promise<ConsumerDashboardData> {
    return toConsumerWireContract(consumerDashboardDataSchema, await this.dashboard.getDashboardData(consumer.id));
  }
}
