import { Controller, Get, Inject, Query, Response } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { IQuery } from '../../../common/types'
import { ApiCountRowsResponse } from '../../../decorators/response-count-rows.decorator'
import { ListResponse } from '../../../dtos'
import { User } from '../../../dtos/admin/user.dto'
import { IUserModel } from '../../../models'
import { UsersService } from './users.service'

import { Response as ResponseType } from 'express'
@ApiTags(`admin`)
@Controller(`admin/users`)
export class UsersController {
  constructor(@Inject(UsersService) private readonly service: UsersService) {}

  @Get(`/`)
  @ApiCountRowsResponse(User)
  async findAndCountAll(@Query() query: IQuery<IUserModel>, @Response() res: ResponseType): Promise<ListResponse<User>> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }
}
