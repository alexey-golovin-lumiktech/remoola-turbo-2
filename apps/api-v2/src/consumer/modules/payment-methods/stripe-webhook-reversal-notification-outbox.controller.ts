import { Controller, Get, Headers, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { StripeWebhookReversalNotificationOutboxService } from './stripe-webhook-reversal-notification-outbox.service';
import { assertInternalCronAuthorization, InternalCronGuard, PublicEndpoint } from '../../../common';

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
  @UseGuards(InternalCronGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get()
  @Post()
  async drain(@Headers(`authorization`) authorization?: string, @Query(`limit`) limit?: string) {
    assertInternalCronAuthorization(authorization);

    const drainLimit = parseDrainLimit(limit);
    return drainLimit == null ? this.outbox.processDueRows() : this.outbox.processDueRows(drainLimit);
  }
}
