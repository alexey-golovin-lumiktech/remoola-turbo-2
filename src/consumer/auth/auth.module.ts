import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { UsersModule } from '../entities/users/users.module'
import { GoogleStrategy } from '../../strategies/google.strategy'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { GoogleProfilesModule } from '../entities/google-profiles/google-profiles.module'

@Module({
  imports: [
    GoogleProfilesModule,
    UsersModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>(`JWT_SECRET`)
        const expiresIn = configService.get<string>(`JWT_ACCESS_TOKEN_EXPIRES_IN`)
        return { global: true, secret, signOptions: { expiresIn } }
      },
      inject: [ConfigService]
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy]
})
export class AuthModule {}
