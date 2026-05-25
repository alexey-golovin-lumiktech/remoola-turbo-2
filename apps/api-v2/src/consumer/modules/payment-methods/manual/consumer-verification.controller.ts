import { Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { type ConsumerModel } from '@remoola/database-2';

import { Identity } from '../../../../common';
import { StripeWebhookService } from '../stripe/webhooks/stripe-webhook.service';

@ApiTags(`Consumer: Verification`)
@Controller(`consumer/verification`)
export class ConsumerVerificationController {
  constructor(private readonly stripeWebhookService: StripeWebhookService) {}

  @Post(`sessions`)
  startVerification(@Identity() consumer: ConsumerModel) {
    return this.stripeWebhookService.startVerifyMeStripeSession(consumer.id);
  }
}
