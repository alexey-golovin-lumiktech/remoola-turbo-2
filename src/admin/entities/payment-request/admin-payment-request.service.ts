import { Inject, Injectable } from '@nestjs/common'

import { IPaymentRequestModel } from '@wirebill/shared-common/models'

import { PaymentRequestRepository } from '@-/repositories'

import { BaseService } from '../../../common'

@Injectable()
export class AdminPaymentRequestService extends BaseService<IPaymentRequestModel, PaymentRequestRepository> {
  constructor(@Inject(PaymentRequestRepository) repository: PaymentRequestRepository) {
    super(repository)
  }
}
