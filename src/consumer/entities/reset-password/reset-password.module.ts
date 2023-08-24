import { Module } from '@nestjs/common'

import { ResetPasswordRepository } from './reset-password.repository'
import { ResetPasswordService } from './reset-password.service'

@Module({
  providers: [ResetPasswordRepository, ResetPasswordService],
  exports: [ResetPasswordRepository, ResetPasswordService],
})
export class ResetPasswordModule {}
