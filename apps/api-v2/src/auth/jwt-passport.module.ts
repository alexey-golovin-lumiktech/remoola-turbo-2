import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { envs } from '../envs';
import { JwtStrategy } from './jwt.strategy';
import { DatabaseModule } from '../shared/database.module';

/** Registers the shared JWT strategy and JwtService for the app auth stack and auth-focused tests. */
@Module({
  imports: [
    DatabaseModule,
    PassportModule.register({}),
    JwtModule.register({
      secret: envs.JWT_ACCESS_SECRET!,
      signOptions: { expiresIn: envs.JWT_ACCESS_TTL_SECONDS },
    }),
  ],
  providers: [JwtStrategy],
  exports: [JwtModule],
})
export class JwtPassportModule {}
