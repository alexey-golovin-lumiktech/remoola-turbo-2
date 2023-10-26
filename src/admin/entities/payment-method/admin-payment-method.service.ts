import { Inject, Injectable } from '@nestjs/common'
import { BaseService } from 'src/common'
import { PaymentMethodRepository } from 'src/repositories'

import { IPaymentMethodModel } from '@wirebill/shared-common/models'

@Injectable()
export class AdminPaymentMethodService extends BaseService<IPaymentMethodModel, PaymentMethodRepository> {
  constructor(@Inject(PaymentMethodRepository) repository: PaymentMethodRepository) {
    super(repository)
  }
}
