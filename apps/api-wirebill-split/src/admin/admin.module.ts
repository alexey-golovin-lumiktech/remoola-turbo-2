import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { JWT_ACCESS_SECRET, JWT_ACCESS_TTL } from '../envs';
import { AdminAuthController } from './auth/auth.controller';
import { AdminAuthService } from './auth/auth.service';
import { AdminsController } from './controllers/admin.controller';
import { AdminsService } from './services/admins.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: JWT_ACCESS_SECRET!,
      signOptions: { expiresIn: JWT_ACCESS_TTL },
    }),
  ],
  controllers: [AdminAuthController, AdminsController],
  providers: [AdminAuthService, AdminsService],
})
export class AdminModule {}
