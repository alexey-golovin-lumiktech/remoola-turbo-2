import { Inject, Injectable } from '@nestjs/common'

import { BaseService } from '../../../common'
import { IInvoiceItemModel } from '../../../models'

import { InvoiceItemsRepository } from './invoice-items.repository'

@Injectable()
export class InvoiceItemsService extends BaseService<IInvoiceItemModel, InvoiceItemsRepository> {
  constructor(@Inject(InvoiceItemsRepository) repository: InvoiceItemsRepository) {
    super(repository)
  }

  createManyItems(invoiceId: string, items: Pick<IInvoiceItemModel, `amount` | `description`>[]): Promise<IInvoiceItemModel[]> {
    return this.repository.createMany(items.map(item => Object.assign(item, { invoiceId })))
  }

  getInvoiceItems(filter: { invoiceId: string }): Promise<IInvoiceItemModel[]> {
    return this.repository.find({ filter })
  }
}
