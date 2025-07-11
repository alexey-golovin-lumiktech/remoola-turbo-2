import { Module } from '@nestjs/common'

import { ResetPasswordRepository } from '@-/repositories'

import { ResetPasswordService } from './reset-password.service'

@Module({
  providers: [ResetPasswordRepository, ResetPasswordService],
  exports: [ResetPasswordRepository, ResetPasswordService],
})
export class ResetPasswordModule {}
