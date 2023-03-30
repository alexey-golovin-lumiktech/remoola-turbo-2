import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiTags } from '@nestjs/swagger'
import { IQuery } from 'src/common/types'
import { IUserModel } from 'src/models'
import { UsersService } from './users.service'

@ApiTags(`admin`)
@Controller(`admin/users`)
export class UsersController {
  constructor(@Inject(UsersService) private readonly service: UsersService) {}

  @Get(`/`)
  @UseGuards(AuthGuard(`basic`))
  getUsers(@Query() query?: IQuery<IUserModel>): Promise<{ data: IUserModel[]; count: number }> {
    return this.service.repository.findAndCountAll(query)
  }
}
