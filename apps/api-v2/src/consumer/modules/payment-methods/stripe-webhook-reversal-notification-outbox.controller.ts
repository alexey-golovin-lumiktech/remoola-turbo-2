import { Controller, ForbiddenException, Get, Headers, Post, Query } from '@nestjs/common';

import { StripeWebhookReversalNotificationOutboxService } from './stripe-webhook-reversal-notification-outbox.service';
import { PublicEndpoint } from '../../../common';
import { envs } from '../../../envs';

const MIN_DRAIN_LIMIT = 1;
const MAX_DRAIN_LIMIT = 25;

function parseDrainLimit(value?: string): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(MAX_DRAIN_LIMIT, Math.max(MIN_DRAIN_LIMIT, parsed));
}

@Controller(`internal/jobs/stripe-reversal-notification-outbox`)
export class StripeWebhookReversalNotificationOutboxController {
  constructor(private readonly outbox: StripeWebhookReversalNotificationOutboxService) {}

  @PublicEndpoint()
  @Get()
  @Post()
  async drain(@Headers(`authorization`) authorization?: string, @Query(`limit`) limit?: string) {
    if (authorization !== `Bearer ${envs.CRON_SECRET}`) {
      throw new ForbiddenException(`Invalid job authorization`);
    }

    const drainLimit = parseDrainLimit(limit);
    return drainLimit == null ? this.outbox.processDueRows() : this.outbox.processDueRows(drainLimit);
  }
}
