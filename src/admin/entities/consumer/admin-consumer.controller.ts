import { Body, Controller, Get, Inject, Param, Post, Put, Query, Response } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response as IExpressResponse } from 'express'

import { ListQuery } from '@wirebill/shared-common/common.types'

import { ADMIN } from '../../../dtos'
import { ListResponse } from '../../../dtos/common'
import { TransformResponse } from '../../../interceptors'
import { IConsumerModel } from '../../../models'
import { AdminPanelQueryTransformPipe } from '../../pipes'

import { AdminConsumerService } from './admin-consumer.service'

@ApiTags(`admin`)
@Controller(`admin/consumers`)
export class AdminConsumerController {
  constructor(@Inject(AdminConsumerService) private readonly service: AdminConsumerService) {}

  @Get(`/`)
  @TransformResponse(ListResponse<ADMIN.Consumer>)
  @ApiOkResponse({ type: ListResponse<ADMIN.Consumer> })
  async findAndCountAll(
    @Query(new AdminPanelQueryTransformPipe()) query: ListQuery<IConsumerModel>,
    @Response() res: IExpressResponse,
  ): Promise<ListResponse<ADMIN.Consumer>> {
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
