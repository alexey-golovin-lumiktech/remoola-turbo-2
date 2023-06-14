import { Inject, Injectable } from '@nestjs/common'

import { BaseService } from '../../../common'
import { IInvoiceModel } from '../../../models'

import { AdminInvoiceRepository } from './admin-invoice.repository'

@Injectable()
export class AdminInvoiceService extends BaseService<IInvoiceModel, AdminInvoiceRepository> {
  constructor(@Inject(AdminInvoiceRepository) repository: AdminInvoiceRepository) {
    super(repository)
  }
}
