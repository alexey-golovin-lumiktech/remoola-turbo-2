import { type Provider } from '@nestjs/common';

import { PaymentsProcessor } from './payments.processor';
import { PaymentsService } from './payments.service';

export const providers = [PaymentsProcessor, PaymentsService] satisfies Provider[];
