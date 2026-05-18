import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { InternalCronGuard, PublicEndpoint } from '../common';
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
  @UseGuards(InternalCronGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Get(`detailed`)
  async getDetailedHealth() {
    return this.healthService.getDetailedHealthStatus();
  }

  @PublicEndpoint()
  @UseGuards(InternalCronGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Get(`mail-transport`)
  async getMailTransportHealth() {
    return this.healthService.getMailTransportStatus();
  }

  @PublicEndpoint()
  @UseGuards(InternalCronGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post(`test-email`)
  async sendTestEmail(@Body() body?: SendTestEmail) {
    return this.healthService.sendTestEmail(body?.to);
  }
}
