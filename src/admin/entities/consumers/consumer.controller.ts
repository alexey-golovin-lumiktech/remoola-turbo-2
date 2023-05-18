import { Body, Controller, Get, Inject, Param, Post, Put, Query, Response } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response as IExpressResponse } from 'express'

import { AdminPanelQueryTransformPipe } from '../../pipes'

import { AdminConsumersService } from './consumer.service'

import { ADMIN } from 'src/dtos'
import { TransformResponse } from 'src/interceptors/response.interceptor'
import { IConsumerModel } from 'src/models'
import { IQuery } from 'src/shared-types'

@ApiTags(`admin`)
@Controller(`admin/consumers`)
export class AdminConsumersController {
  constructor(@Inject(AdminConsumersService) private readonly service: AdminConsumersService) {}

  @Get(`/`)
  @TransformResponse(ADMIN.ConsumersList)
  @ApiOkResponse({ type: ADMIN.ConsumersList })
  async findAndCountAll(
    @Query(new AdminPanelQueryTransformPipe()) query: IQuery<IConsumerModel>,
    @Response() res: IExpressResponse,
  ): Promise<ADMIN.ConsumersList> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Post(`/`)
  @ApiOkResponse({ type: ADMIN.Consumer })
  create(@Body() body: ADMIN.UpsertConsumer): Promise<ADMIN.Consumer> {
    return this.service.create(body)
  }

  @Put(`/:consumerId`)
  @ApiOkResponse({ type: ADMIN.Consumer })
  update(@Param(`consumerId`) consumerId: string, @Body() body: ADMIN.UpsertConsumer): Promise<ADMIN.Consumer> {
    return this.service.update(consumerId, body)
  }

  @Get(`/:consumerId`)
  @ApiOkResponse({ type: ADMIN.Consumer })
  getById(@Param(`consumerId`) consumerId: string): Promise<ADMIN.Consumer> {
    return this.service.repository.findById(consumerId)
  }
}
