import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { PublicEndpoint } from '../common';
import { SendTestEmail } from './dto/send-test-email.dto';
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

  @PublicEndpoint()
  @Get(`mail-transport`)
  async getMailTransportHealth() {
    return this.healthService.getMailTransportStatus();
  }

  @PublicEndpoint()
  @Post(`test-email`)
  async sendTestEmail(@Body() body?: SendTestEmail) {
    return this.healthService.sendTestEmail(body?.to);
  }
}
