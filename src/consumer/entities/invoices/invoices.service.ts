import { Inject, Injectable } from '@nestjs/common'

import { BaseService } from '../../../common/base.service'
import { IInvoiceModel } from '../../../models'
import { InvoiceItemsService } from '../invoice-items/invoice-items.service'

import { InvoicesRepository } from './invoices.repository'

@Injectable()
export class InvoicesService extends BaseService<IInvoiceModel, InvoicesRepository> {
  constructor(
    @Inject(InvoicesRepository) repo: InvoicesRepository,
    @Inject(InvoiceItemsService) private readonly invoiceItemsService: InvoiceItemsService
  ) {
    super(repo)
  }
}
