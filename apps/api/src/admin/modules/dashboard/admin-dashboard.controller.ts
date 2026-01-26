import { Controller, Get } from '@nestjs/common';
import { ApiBasicAuth, ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AdminDashboardService } from './admin-dashboard.service';

@ApiTags(`Admin: Dashboard`)
@ApiBearerAuth(`bearer`)
@ApiBasicAuth(`basic`)
@Controller(`admin/dashboard`)
export class AdminDashboardController {
  constructor(private readonly service: AdminDashboardService) {}

  @Get(`stats`)
  getStats() {
    return this.service.getStats();
  }

  @Get(`payment-requests-by-status`)
  getPaymentRequestsByStatus() {
    return this.service.getPaymentRequestsByStatus();
  }

  @Get(`recent-payment-requests`)
  getRecentPaymentRequests() {
    return this.service.getRecentPaymentRequests();
  }

  @Get(`ledger-anomalies`)
  getLedgerAnomalies() {
    return this.service.getLedgerAnomalies();
  }

  @Get(`verification-queue`)
  getVerificationQueue() {
    return this.service.getVerificationQueue();
  }
}
