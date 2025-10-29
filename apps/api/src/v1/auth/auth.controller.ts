import { Body, Controller, HttpCode, Post, Res, Get, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import * as express from 'express';
import _ from 'lodash';

import { parsedEnvs } from '@remoola/env';

import { AuthService } from './auth.service';
import { AuthResponse, Login } from './dto/login.dto';
import { JwtAuthGuard } from './jwt.guard';
import { errors, UserRole } from '../../common';

@Controller({ path: `auth`, version: `1` })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private setAuthCookies(res: express.Response, access: string, refresh: string) {
    const isProd = parsedEnvs.NODE_ENV == `production`;
    const domain = isProd ? parsedEnvs.COOKIE_DOMAIN : undefined; // ❌ don't set on 127.0.0.1(127.0.0.1)
    const sameSite = isProd ? (`none` as const) : (`lax` as const);
    const secure = isProd || parsedEnvs.COOKIE_SECURE == `true`;

    const common = {
      httpOnly: true,
      sameSite,
      secure,
      domain,
      path: `/`,
    };

    const recommended = {
      httpOnly: true,
      secure: true,
      sameSite: `none`, // ✅ required for cross-site
      domain: `.vercel.app`, // or your real prod domain
      path: `/`,
    };

    console.log(`\n************************************`);
    console.log(`common`, common);
    console.log(`recommended`, recommended);
    console.log(`parsedEnvs.NODE_ENV`, parsedEnvs.NODE_ENV);
    console.log(
      `vercel envs`,
      Object.keys(process.env).filter((x) => /vercel/gi.test(x)),
    );
    console.log(`************************************\n`);

    res.cookie(`access_token`, access, { ...common, maxAge: 1000 * 60 * 15 });
    res.cookie(`refresh_token`, refresh, { ...common, maxAge: 1000 * 60 * 60 * 24 * 7 });
  }

  @Post(`login`)
  @HttpCode(200)
  @ApiOkResponse({ type: AuthResponse })
  async login(@Body() body: Login, @Res({ passthrough: true }) res: express.Response) {
    const user = await this.auth.validateUser(body.email, body.password);
    const access = this.auth.signAccess(user);
    const refresh = this.auth.signRefresh(user);
    this.setAuthCookies(res, access, refresh);
    const response = { access_token: access };
    return response;
  }

  @Post(`refresh`)
  @HttpCode(200)
  refresh(@Res({ passthrough: true }) res: express.Response, @Body() body: object) {
    const key = `refresh_token` as const;
    const bodyRefreshToken = _.get(body, key);
    const cookies = res.req.get(`cookies`) as unknown as Record<string, string> | undefined;
    const resReqCookiesRefreshToken: string | null = cookies?.[key] ?? null;

    const refreshToken = bodyRefreshToken || resReqCookiesRefreshToken;
    if (!refreshToken) throw new Error(errors.NO_REFRESH_TOKEN.message);

    const payload = this.auth.verifyRefresh(refreshToken);
    const fakeUser = { id: payload.sub, email: ``, role: UserRole.CLIENT };

    const access = this.auth.signAccess(fakeUser);
    const refresh = this.auth.signRefresh(fakeUser);
    this.setAuthCookies(res, access, refresh);
    return { access_token: access };
  }

  @Post(`logout`)
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: express.Response) {
    res.clearCookie(`access_token`, { path: `/` });
    res.clearCookie(`refresh_token`, { path: `/` });
    return { ok: true };
  }

  @Get(`me`)
  @ApiBearerAuth(`jwt`)
  @UseGuards(JwtAuthGuard)
  whoami(@Req() req: express.Request & { user: any }) {
    return req.user;
  }

  @Get(`echo`)
  echo(@Req() req: express.Request) {
    return { cookies: req.cookies, auth: req.headers.authorization };
  }
}
