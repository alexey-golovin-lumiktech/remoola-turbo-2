import { Inject, Injectable } from '@nestjs/common'

import { InvoicesRepository } from './invoices.repository'

import { BaseService } from 'src/common'
import { IInvoiceModel } from 'src/models'

@Injectable()
export class InvoicesService extends BaseService<IInvoiceModel, InvoicesRepository> {
  constructor(@Inject(InvoicesRepository) repository: InvoicesRepository) {
    super(repository)
  }
}
