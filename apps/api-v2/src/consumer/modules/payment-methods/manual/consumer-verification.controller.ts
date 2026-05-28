import { Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  consumerVerificationSessionResponseSchema,
  type ConsumerVerificationSessionResponse,
} from '@remoola/api-types';
import { type ConsumerModel } from '@remoola/database-2';

import { Identity } from '../../../../common';
import { toConsumerWireContract } from '../../../consumer-wire-contract';
import { StripeWebhookService } from '../stripe/webhooks/stripe-webhook.service';

@ApiTags(`Consumer: Verification`)
@Controller(`consumer/verification`)
export class ConsumerVerificationController {
  constructor(private readonly stripeWebhookService: StripeWebhookService) {}

  @Post(`sessions`)
  async startVerification(@Identity() consumer: ConsumerModel): Promise<ConsumerVerificationSessionResponse> {
    return toConsumerWireContract(
      consumerVerificationSessionResponseSchema,
      await this.stripeWebhookService.startVerifyMeStripeSession(consumer.id),
    );
  }
}
