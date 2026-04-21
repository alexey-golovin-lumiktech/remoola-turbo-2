import { Controller, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/jwt.guard';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2OperationalAlertsService } from './admin-v2-operational-alerts.service';

@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
@ApiTags(`Admin v2: Operational Alerts`)
@Controller(`admin-v2/operational-alerts`)
export class AdminV2OperationalAlertsController {
  constructor(
    private readonly service: AdminV2OperationalAlertsService,

    private readonly accessService: AdminV2AccessService,
  ) {}
}
