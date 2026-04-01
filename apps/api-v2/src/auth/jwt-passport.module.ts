import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JwtStrategy } from './jwt.strategy';

/** Registers Passport `jwt` strategy once for app-wide `JwtAuthGuard` usage. */
@Module({
  imports: [PassportModule.register({})],
  providers: [JwtStrategy],
})
export class JwtPassportModule {}
