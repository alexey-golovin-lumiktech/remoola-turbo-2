import { Inject, Injectable } from '@nestjs/common'

import { IPaymentMethodModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { PaymentMethodRepository } from '../../../repositories'

@Injectable()
export class AdminPaymentMethodService extends BaseService<IPaymentMethodModel, PaymentMethodRepository> {
  constructor(@Inject(PaymentMethodRepository) repository: PaymentMethodRepository) {
    super(repository)
  }
}
