import { Inject, Injectable } from '@nestjs/common'

import { ConsumersService } from '../consumer/consumer.service'

import { InvoicesRepository } from './invoices.repository'

import { BaseService } from 'src/common'
import { CONSUMER } from 'src/dtos'
import { IConsumerModel, IInvoiceModel } from 'src/models'
import { invoiceStatus, invoiceType } from 'src/shared-types'

@Injectable()
export class InvoicesService extends BaseService<IInvoiceModel, InvoicesRepository> {
  constructor(
    @Inject(InvoicesRepository) repo: InvoicesRepository,
    @Inject(ConsumersService) private readonly consumersService: ConsumersService,
  ) {
    super(repo)
  }

  async getInvoices(identity: IConsumerModel, query: CONSUMER.QueryInvoices): Promise<CONSUMER.InvoicesList> {
    const { limit, offset, type } = query
    const paging = { limit, offset }
    const filter = type == invoiceType.incoming ? { refererId: identity.id } : { creatorId: identity.id }
    const invoices = await this.repository.findAndCountAll({ filter, paging, sorting: [] })
    return invoices
  }

  async createInvoice(identity: IConsumerModel, body: CONSUMER.CreateInvoice): Promise<CONSUMER.InvoiceResponse> {
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
