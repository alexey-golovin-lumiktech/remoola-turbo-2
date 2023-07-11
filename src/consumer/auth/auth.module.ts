import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'

import { ConsumerModule } from '../entities/consumer/consumer.module'
import { GoogleProfileDetailsModule } from '../entities/google-profile-details/google-profile-details.module'

import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'

@Module({
  imports: [
    GoogleProfileDetailsModule,
    ConsumerModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>(`JWT_SECRET`)
        const expiresIn = configService.get<string>(`JWT_ACCESS_TOKEN_EXPIRES_IN`)
        return { global: true, secret, signOptions: { expiresIn } }
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
