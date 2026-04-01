import { Global, Module } from '@nestjs/common';

import { BalanceCalculationModule } from './balance-calculation.module';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  imports: [BalanceCalculationModule],
  providers: [PrismaService],
  exports: [PrismaService, BalanceCalculationModule],
})
export class DatabaseModule {}
