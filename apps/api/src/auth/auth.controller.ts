import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import express from 'express';

import { AuthService } from './auth.service';
import { envs, JWT_ACCESS_TTL } from '../envs';
import { ACCESS_TOKEN_COOKIE_KEY } from '../shared-common';
import { LoginBody } from './dto/login.dto';
import { RegisterBody } from './dto/register.dto';
import { JwtAuthGuard } from './jwt.guard';

@ApiTags(`Auth`)
@Controller(`auth`)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post(`login`)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiBody({ type: LoginBody })
  @ApiResponse({ status: 200, description: `Successful login` })
  async login(@Res({ passthrough: true }) res: express.Response, @Body() body: LoginBody) {
    const { accessToken, ...identity } = await this.auth.login(body);
    this.setCookie(res, accessToken);
    return { identity };
  }

  @Post(`register`)
  @ApiBody({ type: RegisterBody })
  @ApiResponse({ status: 201, description: `User registered successfully` })
  async register(@Res({ passthrough: true }) res: express.Response, @Body() body: RegisterBody) {
    const { accessToken, ...identity } = await this.auth.register(body);
    this.setCookie(res, accessToken);
    return { identity };
  }

  @Post(`logout`)
  async logout(@Res({ passthrough: true }) res: express.Response) {
    const opts = {
      path: `/`,
      httpOnly: true,
      secure: envs.NODE_ENV === `production`,
      sameSite: `strict` as const,
    };
    res.clearCookie(ACCESS_TOKEN_COOKIE_KEY, opts);
    return { message: `Logged out` };
  }

  @UseGuards(JwtAuthGuard)
  @Get(`me`)
  me(@Req() req: express.Request) {
    return { identity: req.user };
  }

  private setCookie(res: express.Response, accessToken: string) {
    res.cookie(ACCESS_TOKEN_COOKIE_KEY, accessToken, {
      httpOnly: true,
      secure: envs.NODE_ENV === `production`,
      sameSite: `strict`,
      path: `/`,
      maxAge: JWT_ACCESS_TTL,
    });
  }
}
