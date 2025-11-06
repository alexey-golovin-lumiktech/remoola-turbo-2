import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Response, Request } from 'express';

import { AuthService } from './auth.service';
import { LoginBody } from './dto/login.dto';
import { RegisterBody } from './dto/register.dto';
import { JwtAuthGuard } from './jwt.guard';
import { JWT_ACCESS_COOKIE, JWT_ACCESS_TTL } from '../envs';

@ApiTags(`Auth`)
@Controller(`auth`)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post(`login`)
  @ApiBody({ type: LoginBody })
  @ApiResponse({ status: 200, description: `Successful login` })
  async login(@Res({ passthrough: true }) res: Response, @Body() body: LoginBody) {
    const { accessToken, ...identity } = await this.auth.login(body);
    this.setCookie(res, accessToken);
    return { identity };
  }

  @Post(`register`)
  @ApiBody({ type: RegisterBody })
  @ApiResponse({ status: 201, description: `User registered successfully` })
  async register(@Res({ passthrough: true }) res: Response, @Body() body: RegisterBody) {
    const { accessToken, ...identity } = await this.auth.register(body);
    this.setCookie(res, accessToken);
    return { identity };
  }

  @Post(`logout`)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(JWT_ACCESS_COOKIE, { path: `/` });
    return { message: `Logged out` };
  }

  @UseGuards(JwtAuthGuard)
  @Get(`me`)
  me(@Req() req: Request) {
    return { identity: req.user };
  }

  private setCookie(res: Response, accessToken: string) {
    res.cookie(JWT_ACCESS_COOKIE, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === `production`,
      sameSite: `strict`,
      path: `/`,
      maxAge: JWT_ACCESS_TTL,
    });
  }
}
