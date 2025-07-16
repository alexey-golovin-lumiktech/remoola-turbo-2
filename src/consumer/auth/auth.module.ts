import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { envs } from '../../envs'
import { AccessRefreshTokenRepository } from '../../repositories'
import { AddressDetailsModule } from '../entities/address-details/address-details.module'
import { ConsumerModule } from '../entities/consumer/consumer.module'
import { GoogleProfileDetailsModule } from '../entities/google-profile-details/google-profile-details.module'
import { OrganizationDetailsModule } from '../entities/organization-details/organization-details.module'
import { PersonalDetailsModule } from '../entities/personal-details/personal-details.module'
import { ResetPasswordModule } from '../entities/reset-password/reset-password.module'

import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { GoogleAuthService } from './google-auth.service'

@Module({
  imports: [
    JwtModule.registerAsync({ useFactory: () => ({ secret: envs.JWT_SECRET }) }),
    GoogleProfileDetailsModule,
    PersonalDetailsModule,
    OrganizationDetailsModule,
    AddressDetailsModule,
    ConsumerModule,
    ResetPasswordModule,
  ],
  controllers: [AuthController],
  providers: [AccessRefreshTokenRepository, AuthService, GoogleAuthService],
  exports: [AuthService, GoogleAuthService],
})
export class AuthModule {}
