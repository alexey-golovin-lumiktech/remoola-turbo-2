import { Body, Controller, Get, Inject, Param, Post, Put, Query, Response } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response as IExpressResponse } from 'express'

import { IQuery } from '../../../common'
import { ApiCountRowsResponse } from '../../../decorators/response-count-rows.decorator'
import { Consumer, CreateConsumer, ListResponse, UpdateConsumer } from '../../../dtos'
import { IConsumerModel } from '../../../models'
import { AdminPanelQueryTransformPipe } from '../../pipes'

import { AdminConsumersService } from './consumer.service'

@ApiTags(`admin`)
@Controller(`admin/consumers`)
export class AdminConsumersController {
  constructor(@Inject(AdminConsumersService) private readonly service: AdminConsumersService) {}

  @Get(`/`)
  @ApiCountRowsResponse(Consumer)
  async findAndCountAll(
    @Query(new AdminPanelQueryTransformPipe()) query: IQuery<IConsumerModel>,
    @Response() res: IExpressResponse,
  ): Promise<ListResponse<Consumer>> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Post(`/`)
  @ApiOkResponse({ type: Consumer })
  create(@Body() body: CreateConsumer): Promise<Consumer> {
    return this.service.create(body)
  }

  @Put(`/:consumerId`)
  @ApiOkResponse({ type: Consumer })
  update(@Param(`consumerId`) consumerId: string, @Body() body: UpdateConsumer): Promise<Consumer> {
    return this.service.update(consumerId, body)
  }

  @Get(`/:consumerId`)
  @ApiOkResponse({ type: Consumer })
  getById(@Param(`consumerId`) consumerId: string): Promise<Consumer> {
    return this.service.repository.findById(consumerId)
  }
}
