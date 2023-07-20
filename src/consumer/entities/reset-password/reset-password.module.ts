import { forwardRef, Module } from '@nestjs/common'

import { ConsumerModule } from '../consumer/consumer.module'

import { ResetPasswordRepository } from './reset-password.repository'
import { ResetPasswordService } from './reset-password.service'

@Module({
  imports: [forwardRef(() => ConsumerModule)],
  providers: [ResetPasswordRepository, ResetPasswordService],
  exports: [ResetPasswordRepository, ResetPasswordService],
})
export class ResetPasswordModule {}
