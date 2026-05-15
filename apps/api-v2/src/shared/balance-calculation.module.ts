import { Module } from '@nestjs/common';

import { BalanceCalculationRepository } from './balance-calculation.repository';
import { BalanceCalculationService } from './balance-calculation.service';
import { PrismaModule } from './prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [BalanceCalculationRepository, BalanceCalculationService],
  exports: [BalanceCalculationService],
})
export class BalanceCalculationModule {}
