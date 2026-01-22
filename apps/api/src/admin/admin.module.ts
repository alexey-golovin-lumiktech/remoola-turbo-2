import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { JWT_ACCESS_SECRET, JWT_ACCESS_TTL } from '../envs';
import { AdminAuthController } from './auth/admin-auth.controller';
import { AdminAuthService } from './auth/admin-auth.service';
import { AdminAdminsModule } from './modules/admins/admin-admins.module';
import { AdminConsumersModule } from './modules/consumers/admin-consumers.module';
import { AdminLedgersModule } from './modules/ledger/admin-ledger.module';
import { AdminPaymentRequestsModule } from './modules/payment-requests/admin-payment-requests.module';
import { ConsumerPaymentMethodsModule } from '../consumer/modules/payment-methods/consumer-payment-methods.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: JWT_ACCESS_SECRET!,
      signOptions: { expiresIn: JWT_ACCESS_TTL },
    }),
    AdminAdminsModule,
    AdminConsumersModule,
    AdminLedgersModule,
    AdminPaymentRequestsModule,
    ConsumerPaymentMethodsModule,
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService],
})
export class AdminModule {}
