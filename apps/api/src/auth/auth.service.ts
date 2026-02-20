import * as crypto from 'crypto';

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { $Enums } from '@remoola/database-2';

import { JWT_ACCESS_SECRET, JWT_ACCESS_TTL_SECONDS, JWT_REFRESH_SECRET, JWT_REFRESH_TTL } from '../envs';
import { PrismaService } from '../shared/prisma.service';
import { LoginBody } from './dto/login.dto';
import { RegisterBody } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(body: RegisterBody) {
    const existing = await this.prisma.adminModel.findFirst({
      where: { email: body.email },
      select: { id: true, deletedAt: true },
    });
    if (existing && !existing.deletedAt) throw new UnauthorizedException(`Email already in use`);

    const hash = await bcrypt.hash(body.password, 10);
    const identity = await this.prisma.adminModel.create({
      data: {
        email: body.email,
        password: hash,
        type: body.type || $Enums.AdminType.ADMIN,
        salt: `salt`,
      },
    });

    const accessToken = this.signAccess(identity);
    return { ...identity, accessToken };
  }

  async login(body: LoginBody) {
    const identity = await this.prisma.adminModel.findFirst({
      where: { email: body.email, deletedAt: null },
    });
    if (!identity) throw new UnauthorizedException(`Invalid credentials`);

    const valid = await bcrypt.compare(body.password, identity.password);
    if (!valid) throw new UnauthorizedException(`Invalid credentials`);

    const accessToken = this.signAccess(identity);
    return { ...identity, accessToken };
  }

  private signAccess(user: any) {
    return this.jwt.sign(
      { sub: user.id, email: user.email },
      {
        secret: JWT_ACCESS_SECRET,
        expiresIn: JWT_ACCESS_TTL_SECONDS,
      },
    );
  }

  private async generateRefreshToken(identityId: string) {
    const raw = crypto.randomBytes(64).toString(`hex`);
    const hash = await bcrypt.hash(raw, 10);
    const expiresAt = new Date(Date.now() + JWT_REFRESH_TTL);
    await this.prisma.accessRefreshTokenModel.create({
      data: {
        refreshToken: hash,
        accessToken: hash,
        identityId: identityId,
      },
    });
    return { raw, expiresAt };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = this.jwt.verify(refreshToken, { secret: JWT_REFRESH_SECRET }) as { sub: string };
    } catch {
      this.logger.warn(`Auth: refresh token verification failed`);
      throw new UnauthorizedException(`Invalid or expired refresh token`);
    }
    const identity = await this.prisma.adminModel.findUnique({ where: { id: payload.sub } });
    if (!identity) {
      this.logger.warn(`Auth: user not found for refresh`);
      throw new UnauthorizedException(`User not found`);
    }
    const accessToken = this.signAccess(identity);
    return { ...identity, accessToken };
  }
}
