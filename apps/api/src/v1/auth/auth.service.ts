import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';

import { parsedEnvs } from '@remoola/env';

import { RefreshTokenPayload } from './types';
import { errors } from '../../common';
import { UserEntity } from '../users/user.entity';

import type { StringValue } from 'ms';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>,
    private readonly jwt: JwtService,
  ) {}

  async validateUser(email: string, pass: string, isAdminApp = false) {
    const user = await this.userRepository
      .createQueryBuilder(`u`)
      .addSelect(`u.passwordHash`)
      .where(`u.email = :email`, { email })
      .getOne();
    if (!user) {
      if (!isAdminApp) return this.createClient(email, pass);
      throw new UnauthorizedException(errors.INVALID_CREDENTIALS);
    }
    const ok = await bcrypt.compare(pass, user.passwordHash);
    if (!ok) throw new UnauthorizedException(errors.INVALID_CREDENTIALS);
    return user;
  }

  signAccess(user: Pick<UserEntity, `id` | `email` | `role`>) {
    const secret = parsedEnvs.JWT_SECRET;
    const expiresIn = (parsedEnvs.JWT_ACCESS_TTL || `15m`) as StringValue;
    return this.jwt.sign({ sub: user.id, email: user.email, role: user.role }, { secret, expiresIn });
  }

  signRefresh(user: Pick<UserEntity, `id`>) {
    const secret = parsedEnvs.JWT_REFRESH_SECRET;
    const expiresIn = (parsedEnvs.JWT_REFRESH_TTL || `7d`) as StringValue;
    return this.jwt.sign({ sub: user.id, typ: `refresh` }, { secret, expiresIn });
  }

  verifyRefresh(token: string) {
    try {
      const secret = parsedEnvs.JWT_REFRESH_SECRET;
      return this.jwt.verify<RefreshTokenPayload>(token, { secret });
    } catch {
      throw new UnauthorizedException(`Invalid refresh`);
    }
  }

  private async createClient(email: string, pass: string) {
    return this.userRepository.save(
      this.userRepository.create({
        email,
        name: email,
        passwordHash: await bcrypt.hash(pass, 10),
        role: `client`,
      }),
    );
  }
}
