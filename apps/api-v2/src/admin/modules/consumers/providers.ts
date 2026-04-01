import { type Provider } from '@nestjs/common';

import { AdminConsumersService } from './admin-consumers.service';

export const providers = [AdminConsumersService] satisfies Provider[];
