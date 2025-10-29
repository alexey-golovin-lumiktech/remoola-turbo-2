import { type Provider } from '@nestjs/common';

import { DashboardService } from './dashboard.service';

export const providers = [DashboardService] satisfies Provider[];
