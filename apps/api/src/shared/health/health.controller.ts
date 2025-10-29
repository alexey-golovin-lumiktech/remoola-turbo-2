import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';

@Controller({ path: `health`, version: VERSION_NEUTRAL })
export class HealthController {
  @Get()
  getHealth() {
    return { status: `ok`, note: `This endpoint is version-neutral` };
  }

  @Get(`ping`)
  ping() {
    return { status: `pong`, note: `This endpoint is version-neutral` };
  }
}
