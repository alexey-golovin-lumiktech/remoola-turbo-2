import { type Provider } from '@nestjs/common';

import { AdminAdminsService } from './admin-admins.service';
import { StripeWebhookService } from '../../../consumer/modules/payment-methods/stripe-webhook.service';

export const providers = [
  StripeWebhookService,
  AdminAdminsService, //
] satisfies Provider[];
