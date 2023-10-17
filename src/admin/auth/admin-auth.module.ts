import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'

import { AccessRefreshTokenRepository } from '../../repositories'
import { AdminModule } from '../entities/admin/admin.module'

import { AdminAuthController } from './admin-auth.controller'
import { AdminAuthService } from './admin-auth.service'

@Module({
  imports: [
    AdminModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({ secret: configService.get<string>(`JWT_SECRET`) }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AdminAuthController],
  providers: [AccessRefreshTokenRepository, AdminAuthService],
  exports: [AdminAuthService],
})
export class AdminAuthModule {}
