import { Module } from '@nestjs/common';

import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2PayoutEscalationRepository } from './admin-v2-payout-escalation.repository';
import { AdminV2PayoutEscalationService } from './admin-v2-payout-escalation.service';
import { AdminV2PayoutQueryService } from './admin-v2-payout-query.service';
import { AdminV2PayoutsController } from './admin-v2-payouts.controller';
import { AdminV2PayoutsRepository } from './admin-v2-payouts.repository';
import { AdminV2PayoutsService } from './admin-v2-payouts.service';
import { PayoutHighValuePolicyService } from './payout-high-value-policy.service';
import { PayoutPaymentMethodResolverService } from './payout-payment-method-resolver.service';
import { AdminV2AssignmentsModule } from '../assignments/admin-v2-assignments.module';

@Module({
  imports: [AdminV2SharedModule, AdminV2AssignmentsModule],
  controllers: [AdminV2PayoutsController],
  providers: [
    AdminV2PayoutEscalationRepository,
    AdminV2PayoutEscalationService,
    AdminV2PayoutQueryService,
    AdminV2PayoutsRepository,
    AdminV2PayoutsService,
    PayoutHighValuePolicyService,
    PayoutPaymentMethodResolverService,
  ],
  exports: [AdminV2PayoutsService],
})
export class AdminV2PayoutsModule {}
