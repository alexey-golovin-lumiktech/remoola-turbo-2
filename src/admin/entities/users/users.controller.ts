import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { IQuery } from 'src/common/types'
import { IUserModel } from 'src/models'
import { UsersService } from './users.service'

@ApiTags(`admin / entities`)
@Controller(`admin/users`)
export class UsersController {
  constructor(@Inject(UsersService) private readonly service: UsersService) {}

  @Get(`/`)
  getUsers(@Query() query?: IQuery<IUserModel>): Promise<{ data: IUserModel[]; count: number }> {
    return this.service.repository.findAndCountAll(query)
  }
}
