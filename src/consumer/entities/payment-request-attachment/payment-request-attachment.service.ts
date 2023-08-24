import { Inject, Injectable, Logger } from '@nestjs/common'
import { BaseService } from 'src/common'

import { IPaymentRequestAttachmentCreate } from '@wirebill/shared-common/dtos'
import { IPaymentRequestAttachmentModel } from '@wirebill/shared-common/models'

import { ConsumerResourceService } from '../consumer-resource/consumer-resource.service'

import { PaymentRequestAttachmentRepository } from './payment-request-attachment.repository'

@Injectable()
export class PaymentRequestAttachmentService extends BaseService<IPaymentRequestAttachmentModel, PaymentRequestAttachmentRepository> {
  private readonly logger = new Logger(PaymentRequestAttachmentService.name)

  constructor(
    @Inject(PaymentRequestAttachmentRepository) repository: PaymentRequestAttachmentRepository,
    @Inject(ConsumerResourceService) private readonly consumerResourceService: ConsumerResourceService,
  ) {
    super(repository)
  }

  async getAttachmentList(paymentRequestId: string): Promise<IPaymentRequestAttachmentModel[]> {
    return this.repository.find({ filter: { id: paymentRequestId } })
  }

  async createOne(consumerId: string, paymentRequestId: string, file: Express.Multer.File): Promise<IPaymentRequestAttachmentModel> {
    const consumerResource = await this.consumerResourceService.createOne(consumerId, file)
    const params: IPaymentRequestAttachmentCreate = { requesterId: consumerId, resourceId: consumerResource.resourceId, paymentRequestId }
    return this.repository.create(params)
  }

  async createMany(consumerId: string, paymentRequestId: string, files: Express.Multer.File[]): Promise<IPaymentRequestAttachmentModel[]> {
    const consumerResources = await this.consumerResourceService.createMany(consumerId, files)
    const params: IPaymentRequestAttachmentCreate[] = consumerResources.map(x => ({
      requesterId: consumerId,
      resourceId: x.resourceId,
      paymentRequestId,
    }))
    return this.repository.createMany(params)
  }
}
