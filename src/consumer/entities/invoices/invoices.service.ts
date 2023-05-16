import { Inject, Injectable } from '@nestjs/common'

import { ConsumersService } from '../consumer/consumer.service'

import { InvoicesRepository } from './invoices.repository'

import { BaseService } from 'src/common'
import { ConsumerDTOS } from 'src/dtos'
import { IConsumerModel, IInvoiceModel, invoiceStatus } from 'src/models'

@Injectable()
export class InvoicesService extends BaseService<IInvoiceModel, InvoicesRepository> {
  constructor(
    @Inject(InvoicesRepository) repo: InvoicesRepository,
    @Inject(ConsumersService) private readonly consumersService: ConsumersService,
  ) {
    super(repo)
  }

  async getInvoices(identity: IConsumerModel): Promise<ConsumerDTOS.InvoicesListResponse> {
    const invoices = await this.repository.findAndCountAll({ filter: { creatorId: identity.id } })
    return invoices
  }

  async createInvoice(identity: IConsumerModel, body: ConsumerDTOS.CreateInvoice): Promise<ConsumerDTOS.InvoiceResponse> {
    //@NOTE_IMPORTANT stripe(create customer etc...) !!!!
    const referer = await this.consumersService.upsertConsumer({ email: body.referer })
    const created = await this.repository.create({
      refererId: referer.id,
      charges: body.charges,
      creatorId: identity.id,
      description: body.description,
      status: invoiceStatus.due,
      tax: 1.3,
    })

    return { ...created, referer: referer.email, creator: identity.email }
  }
}
