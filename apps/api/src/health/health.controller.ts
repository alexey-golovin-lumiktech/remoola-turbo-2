import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { PublicEndpoint } from '../common';
import { HealthService } from './health.service';

@ApiTags(`Health`)
@Controller(`health`)
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @PublicEndpoint()
  @Get()
  async getHealth() {
    return this.healthService.getHealthStatus();
  }

  @PublicEndpoint()
  @Get(`detailed`)
  async getDetailedHealth() {
    return this.healthService.getDetailedHealthStatus();
  }
}
