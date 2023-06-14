import { Body, Controller, Get, Inject, Param, Post, Put, Query, Response } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response as IExpressResponse } from 'express'

import { ADMIN } from '../../../dtos'
import { TransformResponse } from '../../../interceptors/response.interceptor'
import { IConsumerModel } from '../../../models'
import { IQuery } from '../../../shared-types'
import { AdminPanelQueryTransformPipe } from '../../pipes'

import { AdminConsumerService } from './admin-consumer.service'

@ApiTags(`admin`)
@Controller(`admin/consumers`)
export class AdminConsumerController {
  constructor(@Inject(AdminConsumerService) private readonly service: AdminConsumerService) {}

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
