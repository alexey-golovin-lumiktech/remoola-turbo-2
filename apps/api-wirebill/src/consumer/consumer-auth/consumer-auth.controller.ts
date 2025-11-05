import { Body, Controller, HttpCode, Post, Res, Get, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import * as express from 'express';
import _ from 'lodash';

import { parsedEnvs } from '@remoola/env';

import { ConsumerAuthService } from './consumer-auth.service';
import { ConsumerJwtAuthGuard } from './consumer-jwt.guard';
import { ConsumerAuthResponse, ConsumerLogin } from './dto/login.dto';
import { ACCESS_TOKEN_COOKIE_KEY, REFRESH_TOKEN_COOKIE_KEY } from '../../common/constants';
import { JWT_ACCESS_TTL, JWT_REFRESH_TTL } from '../../envs';

@Controller()
export class ConsumerAuthController {
  constructor(private readonly auth: ConsumerAuthService) {}

  private setAuthCookies(res: express.Response, accessToken: string, refreshToken: string) {
    const isProd = parsedEnvs.NODE_ENV == `production`;

    const sameSite = isProd ? (`none` as const) : (`lax` as const);
    const secure = isProd || parsedEnvs.COOKIE_SECURE == `true`;

    const common = {
      httpOnly: true,
      sameSite,
      secure,
      path: `/`,
    };

    res.cookie(ACCESS_TOKEN_COOKIE_KEY, accessToken, { ...common, maxAge: JWT_ACCESS_TTL });
    res.cookie(REFRESH_TOKEN_COOKIE_KEY, refreshToken, { ...common, maxAge: JWT_REFRESH_TTL });
  }

  @Post(`login`)
  @HttpCode(200)
  @ApiOkResponse({ type: ConsumerAuthResponse })
  async login(@Body() body: ConsumerLogin, @Res({ passthrough: true }) res: express.Response) {
    const user = await this.auth.validateUser(body.email, body.password);
    const accessToken = this.auth.signAccess(user);
    const refreshToken = this.auth.signRefresh(user);
    this.setAuthCookies(res, accessToken, refreshToken);
    return { accessToken };
  }

  @Post(`refresh`)
  @HttpCode(200)
  refresh(@Res({ passthrough: true }) res: express.Response, @Body() body: object) {
    const bodyRefreshToken = _.get(body, REFRESH_TOKEN_COOKIE_KEY, null);
    const cookies = res.req.get(`cookies`) as unknown as Record<string, string> | undefined;
    const resReqCookiesRefreshToken: string | null = _.get(cookies, REFRESH_TOKEN_COOKIE_KEY, null);

    const incomingRefreshToken = bodyRefreshToken || resReqCookiesRefreshToken;
    if (!incomingRefreshToken) throw new Error(`NO_REFRESH_TOKEN`);

    const verified = this.auth.verifyRefresh(incomingRefreshToken);
    const payload = { id: verified.sub, email: verified.email, role: verified.role };

    const accessToken = this.auth.signAccess(payload);
    const refreshToken = this.auth.signRefresh(payload);
    this.setAuthCookies(res, accessToken, refreshToken);
    return { accessToken };
  }

  @Post(`logout`)
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: express.Response) {
    res.clearCookie(ACCESS_TOKEN_COOKIE_KEY, { path: `/` });
    res.clearCookie(REFRESH_TOKEN_COOKIE_KEY, { path: `/` });
    return { ok: true };
  }

  @Get(`me`)
  @ApiBearerAuth(`jwt`)
  @UseGuards(ConsumerJwtAuthGuard)
  whoami(@Req() req: express.Request & { user: any }) {
    return req.user;
  }

  @Get(`echo`)
  echo(@Req() req: express.Request) {
    return { cookies: req.cookies, auth: req.headers.authorization };
  }
}
