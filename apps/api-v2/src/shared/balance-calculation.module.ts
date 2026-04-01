import { Module } from '@nestjs/common';

import { BalanceCalculationService } from './balance-calculation.service';
import { PrismaModule } from './prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [BalanceCalculationService],
  exports: [BalanceCalculationService],
})
export class BalanceCalculationModule {}
