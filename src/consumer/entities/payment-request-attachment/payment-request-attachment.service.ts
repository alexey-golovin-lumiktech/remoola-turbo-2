import { Inject, Injectable, Logger } from '@nestjs/common'

import { IPaymentRequestAttachmentCreate } from '@wirebill/shared-common/dtos'
import { IPaymentRequestAttachmentModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { ResourceService } from '../../../common-shared-modules/resource/resource.service'
import { CONSUMER } from '../../../dtos'
import { ConsumerResourceService } from '../consumer-resource/consumer-resource.service'

import { PaymentRequestAttachmentRepository } from './payment-request-attachment.repository'

@Injectable()
export class PaymentRequestAttachmentService extends BaseService<IPaymentRequestAttachmentModel, PaymentRequestAttachmentRepository> {
  private readonly logger = new Logger(PaymentRequestAttachmentService.name)

  constructor(
    @Inject(PaymentRequestAttachmentRepository) repository: PaymentRequestAttachmentRepository,
    @Inject(ConsumerResourceService) private readonly consumerResourceService: ConsumerResourceService,
    @Inject(ResourceService) private readonly resourceService: ResourceService,
  ) {
    super(repository)
  }

  async getAttachmentList(requesterId: string, paymentRequestId: string): Promise<CONSUMER.PaymentRequestAttachmentResponse[]> {
    const attachments = await this.repository.find({ filter: { paymentRequestId } })
    const collected: CONSUMER.PaymentRequestAttachmentResponse[] = []
    for (const attachment of attachments) {
      const resource = await this.resourceService.repository.findOne({ id: attachment.resourceId })
      const { access, originalname, mimetype, size, bucket, key, downloadUrl } = resource
      collected.push({ ...attachment, access, originalname, mimetype, size, bucket, key, downloadUrl })
    }

    return collected
  }

  async createOne(consumerId: string, paymentRequestId: string, file: Express.Multer.File): Promise<IPaymentRequestAttachmentModel> {
    const consumerResource = await this.consumerResourceService.createOne(consumerId, file)
    const params: IPaymentRequestAttachmentCreate = { requesterId: consumerId, resourceId: consumerResource.resourceId, paymentRequestId }
    return this.repository.create(params)
  }

  async createMany(consumerId: string, paymentRequestId: string, files: Express.Multer.File[]): Promise<IPaymentRequestAttachmentModel[]> {
    const consumerResources = await this.consumerResourceService.createMany(consumerId, files)
    if (consumerResources.length == 0) return []

    const params: IPaymentRequestAttachmentCreate[] = consumerResources.map(x => ({
      requesterId: consumerId,
      resourceId: x.resourceId,
      paymentRequestId,
    }))
    return this.repository.createMany(params)
  }
}
