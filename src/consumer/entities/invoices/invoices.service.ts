import { Inject, Injectable } from '@nestjs/common'

import { BaseService } from '../../../common'
import { IConsumerModel, IInvoiceModel, invoiceStatus } from '../../../models'
import { ConsumersService } from '../consumer/consumer.service'

import { InvoicesRepository } from './invoices.repository'

import { IListResponse } from 'src/dtos'
import { ICreateInvoice } from 'src/dtos/consumer'

@Injectable()
export class InvoicesService extends BaseService<IInvoiceModel, InvoicesRepository> {
  constructor(
    @Inject(InvoicesRepository) repo: InvoicesRepository,
    @Inject(ConsumersService) private readonly consumersService: ConsumersService,
  ) {
    super(repo)
  }

  async getInvoices(identity: IConsumerModel): Promise<IListResponse<IInvoiceModel>> {
    const invoices = await this.repository.findAndCountAll({ filter: { creator: identity.email } })
    return invoices
  }

  async createInvoice(identity: IConsumerModel, body: ICreateInvoice): Promise<IInvoiceModel> {
    //@NOTE_IMPORTANT stripe(create customer etc...) !!!!
    const referer = await this.consumersService.upsertConsumer({ email: body.referer })
    const created = await this.repository.create({
      referer: referer.email,
      charges: body.charges,
      creator: identity.email,
      description: body.description,
      status: invoiceStatus.due,
      tax: 1.3,
    })
    return created
  }
}
