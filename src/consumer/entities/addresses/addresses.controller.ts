import { Controller } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

@ApiTags(`consumer`)
@Controller(`consumer/addresses`)
export class AddressesController {}
