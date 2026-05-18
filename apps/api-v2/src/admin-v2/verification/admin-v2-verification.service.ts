import { Injectable } from '@nestjs/common';

import { AdminV2VerificationCaseService } from './admin-v2-verification-case.service';
import { AdminV2VerificationDecisionService } from './admin-v2-verification-decision.service';
import { type DecisionControls, type RequestMeta, type VerificationDecision } from './admin-v2-verification-policy';
import { AdminV2VerificationQueueService } from './admin-v2-verification-queue.service';

@Injectable()
export class AdminV2VerificationService {
  constructor(
    private readonly queueService: AdminV2VerificationQueueService,
    private readonly caseService: AdminV2VerificationCaseService,
    private readonly decisionService: AdminV2VerificationDecisionService,
  ) {}

  async getQueue(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    stripeIdentityStatus?: string;
    country?: string;
    contractorKind?: string;
    missingProfileData?: boolean;
    missingDocuments?: boolean;
  }) {
    return this.queueService.getQueue(params);
  }

  async getQueueCount(filters?: {
    status?: string;
    stripeIdentityStatus?: string;
    country?: string;
    contractorKind?: string;
    missingProfileData?: boolean;
    missingDocuments?: boolean;
  }): Promise<number> {
    return this.queueService.getQueueCount(filters);
  }

  async getCase(consumerId: string, controls: DecisionControls) {
    return this.caseService.getCase(consumerId, controls);
  }

  async applyDecision(
    consumerId: string,
    adminId: string,
    decision: VerificationDecision,
    body: { confirmed?: boolean; reason?: string | null; version?: number | string },
    meta: RequestMeta,
  ) {
    return this.decisionService.applyDecision(consumerId, adminId, decision, body, meta);
  }
}
