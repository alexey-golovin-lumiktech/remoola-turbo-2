import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';

import { adminErrorCodes } from '@remoola/shared-constants';

import { AdminIdentityRepository } from './admin-identity.repository';
import { passwordUtils } from '../shared-common';

@Injectable()
export class AdminStepUpService {
  constructor(private readonly adminIdentityRepository: AdminIdentityRepository) {}

  async verify(adminId: string, passwordConfirmation: string): Promise<void> {
    const trimmed = typeof passwordConfirmation === `string` ? passwordConfirmation.trim() : ``;
    if (trimmed.length === 0) {
      throw new BadRequestException(adminErrorCodes.ADMIN_PASSWORD_CONFIRMATION_REQUIRED);
    }

    const admin = await this.adminIdentityRepository.findStepUpCredentialsById(adminId);
    if (!admin) {
      throw new UnauthorizedException(adminErrorCodes.ADMIN_PASSWORD_CONFIRMATION_INVALID);
    }

    const valid = await passwordUtils.verifyPassword({
      password: trimmed,
      storedHash: admin.password,
      storedSalt: admin.salt,
    });
    if (!valid) {
      throw new UnauthorizedException(adminErrorCodes.ADMIN_PASSWORD_CONFIRMATION_INVALID);
    }
  }
}
