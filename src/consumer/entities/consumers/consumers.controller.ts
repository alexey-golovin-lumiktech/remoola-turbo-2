import { Controller, Get, Inject, NotFoundException, Param } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import { ConsumersService } from './consumers.service'

@ApiTags(`consumer`)
@Controller(`consumer/consumers`)
export class consumersController {
  constructor(@Inject(ConsumersService) private readonly service: ConsumersService) {}

  @Get(`/:email`)
  async findConsumerByEmail(@Param(`email`) email: string) {
    const consumer = await this.service.findByEmail(email)
    if (!consumer) throw new NotFoundException(`consumer email: ${email} does not exists`)
    return consumer
  }
}
