import { Inject, Injectable } from '@nestjs/common'

import { IPaymentRequestModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { AdminConsumerService } from '../consumer/admin-consumer.service'

import { AdminPaymentRequestRepository } from './admin-payment-request.repository'

@Injectable()
export class AdminPaymentRequestService extends BaseService<IPaymentRequestModel, AdminPaymentRequestRepository> {
  constructor(
    @Inject(AdminPaymentRequestRepository) repository: AdminPaymentRequestRepository,
    @Inject(AdminConsumerService) private readonly adminConsumerService: AdminConsumerService,
  ) {
    super(repository)
  }
}
