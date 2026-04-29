import { Global, Module } from '@nestjs/common';

import { BalanceCalculationModule } from './balance-calculation.module';
import { OriginResolverService } from './origin-resolver.service';
import { PrismaService } from './prisma.service';
import { createStripeClient, STRIPE_CLIENT } from './stripe-client';

@Global()
@Module({
  imports: [BalanceCalculationModule],
  providers: [
    PrismaService,
    OriginResolverService,
    {
      provide: STRIPE_CLIENT,
      useFactory: createStripeClient,
    },
  ],
  exports: [PrismaService, OriginResolverService, STRIPE_CLIENT, BalanceCalculationModule],
})
export class DatabaseModule {}
