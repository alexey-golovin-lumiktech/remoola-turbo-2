import { type Provider } from '@nestjs/common';

import { ContractsService } from './contracts.service';

export const providers = [ContractsService] satisfies Provider[];
