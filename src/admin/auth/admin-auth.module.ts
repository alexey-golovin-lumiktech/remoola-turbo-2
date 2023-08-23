import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'

import { AdminModule } from '../entities/admin/admin.module'

import { AdminAuthController } from './admin-auth.controller'
import { AdminAuthService } from './admin-auth.service'

@Module({
  imports: [
    AdminModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>(`JWT_SECRET`)
        const expiresIn = configService.get<string>(`JWT_ACCESS_TOKEN_EXPIRES_IN`)
        return { secret, signOptions: { expiresIn } }
      },
      inject: [ConfigService],
    }),
  ],
  providers: [AdminAuthService],
  exports: [AdminAuthService],
  controllers: [AdminAuthController],
})
export class AdminAuthModule {}
