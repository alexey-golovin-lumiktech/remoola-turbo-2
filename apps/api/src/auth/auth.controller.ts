import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import express from 'express';

import { AuthService } from './auth.service';
import { envs } from '../envs';
import {
  getApiConsumerAccessTokenCookieKey,
  getApiConsumerAuthCookieClearOptions,
  getApiConsumerAuthCookieOptions,
} from '../shared-common';
import { LoginBody } from './dto/login.dto';
import { RegisterBody } from './dto/register.dto';
import { JwtAuthGuard } from './jwt.guard';

@ApiTags(`Auth`)
@Controller(`auth`)
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post(`login`)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiBody({ type: LoginBody })
  @ApiResponse({ status: 200, description: `Successful login` })
  async login(@Req() req: express.Request, @Res({ passthrough: true }) res: express.Response, @Body() body: LoginBody) {
    const { accessToken, ...identity } = await this.service.login(body);
    this.setCookie(req, res, accessToken);
    return { identity };
  }

  @Post(`register`)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiBody({ type: RegisterBody })
  @ApiResponse({ status: 201, description: `User registered successfully` })
  async register(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
    @Body() body: RegisterBody,
  ) {
    const { accessToken, ...identity } = await this.service.register(body);
    this.setCookie(req, res, accessToken);
    return { identity };
  }

  @Post(`logout`)
  async logout(@Req() req: express.Request, @Res({ passthrough: true }) res: express.Response) {
    res.clearCookie(getApiConsumerAccessTokenCookieKey(req), getApiConsumerAuthCookieClearOptions(req));
    return { message: `Logged out` };
  }

  @UseGuards(JwtAuthGuard)
  @Get(`me`)
  me(@Req() req: express.Request) {
    return { identity: req.user };
  }

  private setCookie(req: express.Request, res: express.Response, accessToken: string) {
    res.cookie(getApiConsumerAccessTokenCookieKey(req), accessToken, {
      ...getApiConsumerAuthCookieOptions(req),
      maxAge: envs.JWT_ACCESS_TOKEN_EXPIRES_IN,
    });
  }
}
