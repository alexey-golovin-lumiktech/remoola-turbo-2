import { type Provider } from '@nestjs/common';

import { AdminExchangeService } from './admin-exchange.service';

export const providers = [AdminExchangeService] satisfies Provider[];
