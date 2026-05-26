import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import express from 'express';

import { PublicEndpoint, TrackConsumerAction } from '../../../common';
import { ConsumerAuthService } from '../auth.service';
import { ConsumerAuthControllerSupportService } from '../consumer-auth-controller-support.service';
import { ForgotPasswordBody, ResetPassword } from '../dto';

@Controller(`consumer/auth`)
export class ConsumerPasswordController {
  constructor(
    private readonly service: ConsumerAuthService,
    private readonly supportService: ConsumerAuthControllerSupportService,
  ) {}

  @PublicEndpoint()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get(`forgot-password/verify`)
  async forgotPasswordVerify(@Query(`token`) token: string, @Res() res: express.Response) {
    await this.service.validateForgotPasswordTokenAndRedirect(token ?? ``, res);
  }

  @PublicEndpoint()
  @TrackConsumerAction({ action: `consumer.auth.forgot_password_request`, resource: `auth` })
  @Post(`forgot-password`)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Req() req: express.Request,
    @Body() body: ForgotPasswordBody,
    @Query(`appScope`) appScope?: string,
  ) {
    const consumerScope = this.supportService.requireClaimedConsumerAppScope(req, appScope);
    await this.service.requestPasswordReset(body.email, consumerScope);
    return {
      message: `If an account exists, we sent recovery instructions.`,
      recoveryMode: `provider_aware`,
    };
  }

  @PublicEndpoint()
  @Post(`password/reset`)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: ResetPassword) {
    await this.service.resetPasswordWithToken(body.token, body.password);
    return { success: true };
  }
}
