import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { AdminsModule } from '../entities/admins/admins.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'

@Module({
  imports: [
    AdminsModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>(`JWT_SECRET`)
        const expiresIn = configService.get<string>(`JWT_ACCESS_TOKEN_EXPIRES_IN`)
        return { secret, signOptions: { expiresIn } }
      },
      inject: [ConfigService]
    })
  ],
  controllers: [AuthController],
  providers: [AuthService]
})
export class AuthModule {}
