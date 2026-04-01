import { type Provider } from '@nestjs/common';

import { AdminDashboardService } from './admin-dashboard.service';

export const providers = [AdminDashboardService] satisfies Provider[];
