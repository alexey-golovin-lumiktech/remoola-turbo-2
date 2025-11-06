import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { JwtAuthGuard } from '../../auth/jwt.guard';

@ApiTags(`Consumer: Profile`)
@ApiBearerAuth()
@Controller(`profile`)
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor() {}

  @Get()
  async getProfile(@Req() req: Request) {
    console.log(`getProfile`, { user: req.user, secret: req.secret });
    return req.user;
  }
}
