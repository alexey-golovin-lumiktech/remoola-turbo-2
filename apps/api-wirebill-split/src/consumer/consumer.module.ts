import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MailerModule, MailerOptions } from '@nestjs-modules/mailer';

import { envs, JWT_ACCESS_SECRET, JWT_ACCESS_TTL } from '../envs';
import { ConsumerAuthController } from './auth/auth.controller';
import { ConsumerAuthService } from './auth/auth.service';
import { GoogleAuthService } from './auth/google-auth.service';
import { ProfileController } from './controllers/profile.controller';
import { MailingService } from '../shared/mailing.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: JWT_ACCESS_SECRET!,
      signOptions: { expiresIn: JWT_ACCESS_TTL },
    }),
    MailerModule.forRootAsync({
      useFactory: () => {
        return {
          transport: {
            host: envs.NODEMAILER_SMTP_HOST,
            port: envs.NODEMAILER_SMTP_PORT,
            auth: {
              user: envs.NODEMAILER_SMTP_USER,
              pass: envs.NODEMAILER_SMTP_USER_PASS,
            },
            pool: true,
          },
          defaults: { from: envs.NODEMAILER_SMTP_DEFAULT_FROM },
        } satisfies MailerOptions;
      },
    }),
  ],
  controllers: [ConsumerAuthController, ProfileController],
  providers: [MailingService, ConsumerAuthService, GoogleAuthService],
})
export class ConsumerModule {}
