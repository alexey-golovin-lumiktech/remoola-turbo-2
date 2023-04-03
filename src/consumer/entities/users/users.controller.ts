import { Controller, Inject } from '@nestjs/common'
import { UsersService } from './users.service'

@Controller(`consumer/users`)
export class UsersController {
  constructor(@Inject(UsersService) private readonly service: UsersService) {}
}
