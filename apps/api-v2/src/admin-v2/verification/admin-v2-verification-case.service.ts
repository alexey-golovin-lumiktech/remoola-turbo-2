import { Injectable, NotFoundException } from '@nestjs/common';

import { deriveVersion, type DecisionControls } from './admin-v2-verification-policy';
import { AdminV2VerificationSlaService } from './admin-v2-verification-sla.service';
import { AdminV2VerificationQuery } from './admin-v2-verification.query';
import { AdminV2AssignmentsService } from '../assignments/admin-v2-assignments.service';
import { AdminV2ConsumersService } from '../consumers/admin-v2-consumers.service';

@Injectable()
export class AdminV2VerificationCaseService {
  constructor(
    private readonly consumersService: AdminV2ConsumersService,
    private readonly query: AdminV2VerificationQuery,
    private readonly slaService: AdminV2VerificationSlaService,
    private readonly assignmentsService: AdminV2AssignmentsService,
  ) {}

  async getCase(consumerId: string, controls: DecisionControls) {
    const [consumerCase, decisionHistory, authRisk, slaSnapshot, assignment] = await Promise.all([
      this.consumersService.getConsumerCase(consumerId),
      this.query.getDecisionHistory(consumerId),
      this.query.getAuthRiskContext(consumerId),
      this.slaService.getSnapshot(),
      this.assignmentsService.getAssignmentContextForResource(`verification`, consumerId),
    ]);
    if (!authRisk) {
      throw new NotFoundException(`Consumer not found`);
    }
    const updatedAt =
      consumerCase.updatedAt instanceof Date ? consumerCase.updatedAt : new Date(consumerCase.updatedAt);
    return {
      ...consumerCase,
      version: deriveVersion(updatedAt),
      decisionControls: controls,
      decisionHistory,
      authRisk,
      assignment,
      verificationSla: {
        breached: slaSnapshot.breachedConsumerIds.has(consumerId),
        thresholdHours: slaSnapshot.thresholdHours,
        lastComputedAt: slaSnapshot.lastComputedAt,
      },
    };
  }
}
