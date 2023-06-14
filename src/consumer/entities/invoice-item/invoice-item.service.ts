import { Inject, Injectable } from '@nestjs/common'

import { BaseService } from '../../../common'
import { IInvoiceItemModel } from '../../../models'

import { InvoiceItemRepository } from './invoice-item.repository'

@Injectable()
export class InvoiceItemService extends BaseService<IInvoiceItemModel, InvoiceItemRepository> {
  constructor(@Inject(InvoiceItemRepository) repository: InvoiceItemRepository) {
    super(repository)
  }

  createManyItems(invoiceId: string, items: Pick<IInvoiceItemModel, `amount` | `description`>[]): Promise<IInvoiceItemModel[]> {
    return this.repository.createMany(items.map(item => Object.assign(item, { invoiceId })))
  }

  getInvoiceItems(filter: { invoiceId: string }): Promise<IInvoiceItemModel[]> {
    return this.repository.find({ filter })
  }
}
