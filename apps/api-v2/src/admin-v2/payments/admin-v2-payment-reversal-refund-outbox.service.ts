import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { AdminV2PaymentReversalRefundFinalizerService } from './admin-v2-payment-reversal-refund-finalizer.service';
import { parseAdminRefundFinalizationOutboxPayload } from './admin-v2-payment-reversal-refund-outbox';
import { AdminV2PaymentReversalRefundOutboxRepository } from './admin-v2-payment-reversal-refund-outbox.repository';
import { SCHEDULER_BATCH_LIMITS, SCHEDULER_CRON } from '../../shared/scheduler-policy';

@Injectable()
export class AdminV2PaymentReversalRefundOutboxService {
  private static readonly MAX_BATCH_SIZE: number = SCHEDULER_BATCH_LIMITS.adminRefundFinalizationOutbox;

  private readonly logger = new Logger(AdminV2PaymentReversalRefundOutboxService.name);

  constructor(
    private readonly outboxRepository: AdminV2PaymentReversalRefundOutboxRepository,
    private readonly refundFinalizer: AdminV2PaymentReversalRefundFinalizerService,
  ) {}

  @Cron(SCHEDULER_CRON.adminRefundFinalizationOutbox)
  async processDueRows(limit = AdminV2PaymentReversalRefundOutboxService.MAX_BATCH_SIZE) {
    const claimed = await this.outboxRepository.claimDueRows({ limit });
    let finalized = 0;
    let failed = 0;

    for (const row of claimed) {
      try {
        const payload = parseAdminRefundFinalizationOutboxPayload(row.payload);
        await this.refundFinalizer.finalizeQueuedPayload(payload);
        await this.outboxRepository.markSent(row);
        finalized += 1;
      } catch (error) {
        failed += 1;
        await this.outboxRepository.markFailed(row, error);
        this.logger.warn({
          event: `admin_refund_finalization_outbox_failed`,
          outboxId: row.id,
          errorClass: error instanceof Error ? error.name : `UnknownError`,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (claimed.length > 0) {
      this.logger.log({
        event: `admin_refund_finalization_outbox_complete`,
        claimed: claimed.length,
        finalized,
        failed,
      });
    }

    return { claimed: claimed.length, finalized, failed };
  }
}
