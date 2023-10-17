import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'

import { AccessRefreshTokenRepository } from '../../repositories'
import { AddressDetailsModule } from '../entities/address-details/address-details.module'
import { ConsumerModule } from '../entities/consumer/consumer.module'
import { GoogleProfileDetailsModule } from '../entities/google-profile-details/google-profile-details.module'
import { OrganizationDetailsModule } from '../entities/organization-details/organization-details.module'
import { PersonalDetailsModule } from '../entities/personal-details/personal-details.module'
import { ResetPasswordModule } from '../entities/reset-password/reset-password.module'

import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({ secret: configService.get<string>(`JWT_SECRET`) }),
      inject: [ConfigService],
    }),
    GoogleProfileDetailsModule,
    PersonalDetailsModule,
    OrganizationDetailsModule,
    AddressDetailsModule,
    ConsumerModule,
    ResetPasswordModule,
  ],
  controllers: [AuthController],
  providers: [AccessRefreshTokenRepository, AuthService],
  exports: [AuthService],
})
export class AuthModule {}
