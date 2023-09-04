import { Inject, Injectable } from '@nestjs/common'

import { ITransactionCreate } from '@wirebill/shared-common/dtos'
import { IPaymentRequestModel, ITransactionModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { TransactionRepository } from '../../../repositories'

@Injectable()
export class TransactionService extends BaseService<ITransactionModel, TransactionRepository> {
  constructor(@Inject(TransactionRepository) repository: TransactionRepository) {
    super(repository)
  }

  createFromPaymentRequest(paymentRequest: IPaymentRequestModel): Promise<ITransactionModel> {
    return this.repository.create({
      paymentRequestId: paymentRequest.id,
      currencyCode: paymentRequest.currencyCode,
      originAmount: paymentRequest.amount,
      type: paymentRequest.type,
      status: paymentRequest.status,
      createdBy: paymentRequest.createdBy,
      updatedBy: paymentRequest.updatedBy,
      deletedBy: paymentRequest.deletedBy,
    } satisfies ITransactionCreate)
  }
}
