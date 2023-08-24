import { Inject, Injectable, Logger } from '@nestjs/common'
import { BaseService } from 'src/common'
import { AwsS3Service } from 'src/common-shared-modules/aws-s3/aws-s3.service'
import { ResourceService } from 'src/common-shared-modules/resource/resource.service'

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
    @Inject(ResourceService) private readonly resourceService: ResourceService,
    private readonly s3Service: AwsS3Service,
  ) {
    super(repository)
  }

  async createPaymentRequestAttachment(consumerId: string, paymentRequestId: string, file: Express.Multer.File) {
    const consumerResource = await this.consumerResourceService.createConsumerResource(consumerId, file)
    const params: IPaymentRequestAttachmentCreate = { requesterId: consumerId, resourceId: consumerResource.resourceId, paymentRequestId }
    return this.repository.create(params)
  }

  async createPaymentRequestAttachmentList(consumerId: string, paymentRequestId: string, files: Express.Multer.File[]) {
    const consumerResources = await this.consumerResourceService.createConsumerResourceList(consumerId, files)
    const params: IPaymentRequestAttachmentCreate[] = consumerResources.map(x => ({
      requesterId: consumerId,
      resourceId: x.resourceId,
      paymentRequestId,
    }))
    return this.repository.createMany(params)
  }
}
