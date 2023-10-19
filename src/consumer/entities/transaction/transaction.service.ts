import { Inject, Injectable } from '@nestjs/common'

import { ITransactionCreate } from '@wirebill/shared-common/dtos'
import { TransactionActionType } from '@wirebill/shared-common/enums'
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
      type: paymentRequest.type,
      status: paymentRequest.status,

      createdBy: paymentRequest.createdBy,
      updatedBy: paymentRequest.updatedBy,
      consumerId: paymentRequest.requesterId,
      actionType: TransactionActionType.outcome,
      originAmount: -paymentRequest.amount,
    } satisfies ITransactionCreate & { consumerId: string })
  }
}
