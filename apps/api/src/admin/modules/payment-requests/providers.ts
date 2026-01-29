import { type Provider } from '@nestjs/common';

import { AdminPaymentRequestsService } from './admin-payment-requests.service';

export const providers = [AdminPaymentRequestsService] satisfies Provider[];
