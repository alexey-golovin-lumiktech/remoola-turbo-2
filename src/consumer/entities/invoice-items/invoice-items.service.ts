import { Inject, Injectable } from '@nestjs/common'

import { BaseService } from '../../../common/base.service'
import { IInvoiceItemModel } from '../../../models'

import { InvoiceItemsRepository } from './invoice-items.repository'

@Injectable()
export class InvoiceItemsService extends BaseService<IInvoiceItemModel, InvoiceItemsRepository> {
  constructor(@Inject(InvoiceItemsRepository) repo: InvoiceItemsRepository) {
    super(repo)
  }
}
