import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { type ConsumerModel } from '@remoola/database-2';

import { StripeWebhookService } from './stripe-webhook.service';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity } from '../../../common';

@ApiTags(`Consumer: Verification`)
@UseGuards(JwtAuthGuard)
@Controller(`consumer/verification`)
export class ConsumerVerificationController {
  constructor(private readonly stripeWebhookService: StripeWebhookService) {}

  @Post(`sessions`)
  startVerification(@Identity() consumer: ConsumerModel) {
    return this.stripeWebhookService.startVerifyMeStripeSession(consumer.id);
  }
}
