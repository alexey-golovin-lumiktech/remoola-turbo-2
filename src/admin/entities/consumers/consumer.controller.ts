import { Body, Controller, Get, Inject, Param, Post, Put, Query, Response } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response as IExpressResponse } from 'express'

import { AdminPanelQueryTransformPipe } from '../../pipes'

import { AdminConsumersService } from './consumer.service'

import { ApiCountRowsResponse } from 'src/decorators/response-count-rows.decorator'
import { AdminDTOS, CommonDTOS } from 'src/dtos'
import { IConsumerModel } from 'src/models'
import { IQuery } from 'src/shared-types'

@ApiTags(`admin`)
@Controller(`admin/consumers`)
export class AdminConsumersController {
  constructor(@Inject(AdminConsumersService) private readonly service: AdminConsumersService) {}

  @Get(`/`)
  @ApiCountRowsResponse(AdminDTOS.Consumer)
  async findAndCountAll(
    @Query(new AdminPanelQueryTransformPipe()) query: IQuery<IConsumerModel>,
    @Response() res: IExpressResponse,
  ): Promise<CommonDTOS.ListResponseDTO<AdminDTOS.Consumer>> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Post(`/`)
  @ApiOkResponse({ type: AdminDTOS.Consumer })
  create(@Body() body: AdminDTOS.UpsertConsumer): Promise<AdminDTOS.Consumer> {
    return this.service.create(body)
  }

  @Put(`/:consumerId`)
  @ApiOkResponse({ type: AdminDTOS.Consumer })
  update(@Param(`consumerId`) consumerId: string, @Body() body: AdminDTOS.UpsertConsumer): Promise<AdminDTOS.Consumer> {
    return this.service.update(consumerId, body)
  }

  @Get(`/:consumerId`)
  @ApiOkResponse({ type: AdminDTOS.Consumer })
  getById(@Param(`consumerId`) consumerId: string): Promise<AdminDTOS.Consumer> {
    return this.service.repository.findById(consumerId)
  }
}
