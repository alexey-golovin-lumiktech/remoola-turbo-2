import { Controller, ForbiddenException, Get, Headers, Post } from '@nestjs/common';

import { StripeWebhookReversalNotificationOutboxService } from './stripe-webhook-reversal-notification-outbox.service';
import { PublicEndpoint } from '../../../common';
import { envs } from '../../../envs';

@Controller(`internal/jobs/stripe-reversal-notification-outbox`)
export class StripeWebhookReversalNotificationOutboxController {
  constructor(private readonly outbox: StripeWebhookReversalNotificationOutboxService) {}

  @PublicEndpoint()
  @Get()
  @Post()
  async drain(@Headers(`authorization`) authorization?: string) {
    if (authorization !== `Bearer ${envs.CRON_SECRET}`) {
      throw new ForbiddenException(`Invalid job authorization`);
    }

    return this.outbox.processDueRows();
  }
}
