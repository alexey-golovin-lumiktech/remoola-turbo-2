import { type Provider } from '@nestjs/common';

import { AdminLedgersService } from './admin-ledger.service';

export const providers = [AdminLedgersService] satisfies Provider[];
