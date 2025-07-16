import { Inject, Injectable } from '@nestjs/common'

import { IPaymentRequestModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { PaymentRequestRepository } from '../../../repositories'

@Injectable()
export class AdminPaymentRequestService extends BaseService<IPaymentRequestModel, PaymentRequestRepository> {
  constructor(@Inject(PaymentRequestRepository) repository: PaymentRequestRepository) {
    super(repository)
  }
}
