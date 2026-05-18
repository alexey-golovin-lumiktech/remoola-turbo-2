import { Injectable } from '@nestjs/common';

import {
  AdminV2PayoutEscalationService,
  type PayoutEscalationRequestBody,
  type PayoutEscalationRequestMeta,
} from './admin-v2-payout-escalation.service';
import { AdminV2PayoutQueryService } from './admin-v2-payout-query.service';

@Injectable()
export class AdminV2PayoutsService {
  constructor(
    private readonly payoutQueryService: AdminV2PayoutQueryService,
    private readonly payoutEscalationService: AdminV2PayoutEscalationService,
  ) {}

  async listPayouts(params?: { cursor?: string; limit?: number }) {
    return this.payoutQueryService.listPayouts(params);
  }

  async getPayoutCase(payoutId: string) {
    return this.payoutQueryService.getPayoutCase(payoutId);
  }

  async escalatePayout(
    payoutId: string,
    adminId: string,
    body: PayoutEscalationRequestBody,
    meta: PayoutEscalationRequestMeta,
  ) {
    return this.payoutEscalationService.escalatePayout(payoutId, adminId, body, meta);
  }
}
