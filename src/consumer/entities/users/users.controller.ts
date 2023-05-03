import { Controller, Get, Inject, NotFoundException, Param } from '@nestjs/common'
import { UsersService } from './users.service'
import { ApiTags } from '@nestjs/swagger'

@ApiTags(`consumer`)
@Controller(`consumer/users`)
export class UsersController {
  constructor(@Inject(UsersService) private readonly service: UsersService) {}

  @Get(`/:email`)
  async getUser(@Param(`email`) email: string) {
    const user = await this.service.findByEmail(email)
    if (!user) throw new NotFoundException(`email: ${email} does not exists`)
    return user
  }
}
