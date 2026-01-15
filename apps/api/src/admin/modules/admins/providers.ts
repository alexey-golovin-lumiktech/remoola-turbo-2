import { type Provider } from '@nestjs/common';

import { AdminAdminsService } from './admin-admins.service';

export const providers = [AdminAdminsService] satisfies Provider[];
