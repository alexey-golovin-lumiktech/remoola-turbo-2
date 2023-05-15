import { Inject, Injectable } from '@nestjs/common'

import { BaseService } from '../../../common'
import { IInvoiceModel } from '../../../models'

import { InvoicesRepository } from './invoices.repository'

@Injectable()
export class InvoicesService extends BaseService<IInvoiceModel, InvoicesRepository> {
  constructor(@Inject(InvoicesRepository) repository: InvoicesRepository) {
    super(repository)
  }
}
