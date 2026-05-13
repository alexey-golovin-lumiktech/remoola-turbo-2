import { Global, Module } from '@nestjs/common';

import { BalanceCalculationModule } from './balance-calculation.module';
import { OriginResolverService } from './origin-resolver.service';
import { PrismaModule } from './prisma.module';
import { createStripeClient, STRIPE_CLIENT } from './stripe-client';

@Global()
@Module({
  imports: [PrismaModule, BalanceCalculationModule],
  providers: [
    OriginResolverService,
    {
      provide: STRIPE_CLIENT,
      useFactory: createStripeClient,
    },
  ],
  exports: [PrismaModule, OriginResolverService, STRIPE_CLIENT, BalanceCalculationModule],
})
export class DatabaseModule {}
