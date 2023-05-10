import { Controller } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

@ApiTags(`consumer`)
@Controller(`consumer/google-profiles`)
export class GoogleProfilesController {}
