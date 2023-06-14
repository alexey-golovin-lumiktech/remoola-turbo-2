import { Controller } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

@ApiTags(`admin`)
@Controller(`admin/invoice-item`)
export class AdminInvoiceItemController {}
