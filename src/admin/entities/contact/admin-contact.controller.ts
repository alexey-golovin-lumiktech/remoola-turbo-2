import { Body, Controller, Delete, Get, Inject, Param, Put, Query, Response } from '@nestjs/common'
import { ApiBasicAuth, ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import express from 'express'

import { IContactModel } from '@wirebill/shared-common/models'
import { ReqQuery } from '@wirebill/shared-common/types'

import { ADMIN } from '../../../dtos'
import { ContactUpdate } from '../../../dtos/admin'
import { ListResponse } from '../../../dtos/common'
import { TransformResponse } from '../../../interceptors'
import { ReqQueryTransformPipe } from '../../pipes'

import { AdminContactService } from './admin-contact.service'

@ApiBearerAuth()
@ApiBasicAuth()
@ApiTags(`admin`)
@Controller(`admin/contacts`)
export class AdminContactController {
  constructor(@Inject(AdminContactService) private readonly service: AdminContactService) {}

  @Get(`/`)
  @TransformResponse(ListResponse<ADMIN.ContactResponse>)
  @ApiOkResponse({ type: ListResponse<ADMIN.ContactResponse> })
  async findAndCountAll(
    @Query(new ReqQueryTransformPipe()) query: ReqQuery<IContactModel>,
    @Response() res: express.Response,
  ): Promise<ListResponse<ADMIN.ContactResponse>> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Get(`/:contactId`)
  @ApiOkResponse({ type: ADMIN.ContactResponse })
  getById(@Param(`contactId`) contactId: string): Promise<ADMIN.ContactResponse> {
    return this.service.repository.findById(contactId)
  }

  @Put(`/:contactId`)
  updateById(@Param(`contactId`) contactId: string, @Body() body: ContactUpdate) {
    return this.service.repository.updateById(contactId, body)
  }

  @Delete(`/:contactId`)
  @ApiOkResponse({ type: Boolean })
  deleteById(@Param(`contactId`) contactId: string): Promise<boolean> {
    return this.service.repository.deleteById(contactId)
  }
}
