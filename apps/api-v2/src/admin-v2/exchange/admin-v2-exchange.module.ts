import { Module } from '@nestjs/common';

import { AdminAuthModule } from '../../admin-auth/admin-auth.module';
import { BalanceCalculationModule } from '../../shared/balance-calculation.module';
import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminExchangeActionLockRepository } from './admin-exchange-action-lock.repository';
import { AdminExchangeConversionPersistenceRepository } from './admin-exchange-conversion-persistence.repository';
import { AdminExchangeRateApprovalPersistenceRepository } from './admin-exchange-rate-approval-persistence.repository';
import { AdminExchangeRateApprovalService } from './admin-exchange-rate-approval.service';
import { AdminExchangeRateQueriesService } from './admin-exchange-rate-queries.service';
import { AdminExchangeRuleCommandsService } from './admin-exchange-rule-commands.service';
import { AdminExchangeRuleQueriesService } from './admin-exchange-rule-queries.service';
import { AdminExchangeScheduledConversionQueriesService } from './admin-exchange-scheduled-conversion-queries.service';
import { AdminScheduledConversionCommandsService } from './admin-scheduled-conversion-commands.service';
import { AdminV2ExchangeCommandsService } from './admin-v2-exchange-commands.service';
import { AdminV2ExchangePersistenceRepository } from './admin-v2-exchange-persistence.repository';
import { AdminV2ExchangePreflightRepository } from './admin-v2-exchange-preflight.repository';
import { AdminV2ExchangeQueriesService } from './admin-v2-exchange-queries.service';
import { AdminV2ExchangeRateQuery } from './admin-v2-exchange-rate.query';
import { AdminV2ExchangeRuleQuery } from './admin-v2-exchange-rule.query';
import { AdminV2ExchangeScheduledConversionQuery } from './admin-v2-exchange-scheduled-conversion.query';
import { AdminV2ExchangeController } from './admin-v2-exchange.controller';
import { AdminV2ExchangeService } from './admin-v2-exchange.service';
import { ExchangeConversionExecutor } from './exchange-conversion-executor';
import { AdminV2AssignmentsModule } from '../assignments/admin-v2-assignments.module';

@Module({
  imports: [AdminAuthModule, AdminV2SharedModule, BalanceCalculationModule, AdminV2AssignmentsModule],
  controllers: [AdminV2ExchangeController],
  providers: [
    AdminExchangeActionLockRepository,
    AdminExchangeConversionPersistenceRepository,
    AdminExchangeRateApprovalPersistenceRepository,
    AdminV2ExchangePersistenceRepository,
    AdminV2ExchangePreflightRepository,
    AdminV2ExchangeRateQuery,
    AdminV2ExchangeRuleQuery,
    AdminV2ExchangeScheduledConversionQuery,
    AdminExchangeRateQueriesService,
    AdminExchangeRuleQueriesService,
    AdminExchangeScheduledConversionQueriesService,
    AdminV2ExchangeQueriesService,
    AdminExchangeRuleCommandsService,
    AdminExchangeRateApprovalService,
    AdminScheduledConversionCommandsService,
    ExchangeConversionExecutor,
    AdminV2ExchangeCommandsService,
    AdminV2ExchangeService,
  ],
})
export class AdminV2ExchangeModule {}
