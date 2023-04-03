import { Body, Controller, Get, Inject, Param, Post, Put, Query, Response } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { IQuery } from '../../../common/types'
import { ApiCountRowsResponse } from '../../../decorators/response-count-rows.decorator'
import { User, CreateUser, ListResponse, UpdateUser } from '../../../dtos'
import { IUserModel } from '../../../models'
import { UsersService } from './users.service'

import { Response as ResponseType } from 'express'
@ApiTags(`user`)
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

  @Post(`/`)
  @ApiOkResponse({ type: User })
  create(@Body() body: CreateUser): Promise<User> {
    return this.service.create(body)
  }

  @Put(`/:userId`)
  @ApiOkResponse({ type: User })
  update(@Param(`userId`) userId: string, @Body() body: UpdateUser): Promise<User> {
    return this.service.update(userId, body)
  }

  @Get(`/:userId`)
  @ApiOkResponse({ type: User })
  getById(@Param(`userId`) userId: string): Promise<User> {
    return this.service.repository.findById(userId)
  }
}
