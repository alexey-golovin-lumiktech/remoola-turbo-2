import { Body, Controller, Delete, Get, Inject, Param, Put, Query, Response } from '@nestjs/common'
import { ApiBasicAuth, ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import express from 'express'

import { IAddressDetailsModel } from '@wirebill/shared-common/models'
import { ReqQuery } from '@wirebill/shared-common/types'

import { ADMIN } from '../../../dtos'
import { TransformResponse } from '../../../interceptors'
import { ReqQueryTransformPipe } from '../../pipes'

import { AdminAddressDetailsService } from './admin-address-details.service'

@ApiBearerAuth()
@ApiBasicAuth()
@ApiTags(`admin`)
@Controller(`admin/address-details`)
export class AdminAddressDetailsController {
  constructor(@Inject(AdminAddressDetailsService) private readonly service: AdminAddressDetailsService) {}

  @Get()
  @TransformResponse(ADMIN.AddressDetailsListResponse)
  @ApiOkResponse({ type: ADMIN.AddressDetailsListResponse })
  async findAndCountAll(
    @Query(new ReqQueryTransformPipe()) query: ReqQuery<IAddressDetailsModel>,
    @Response() res: express.Response,
  ): Promise<ADMIN.AddressDetailsListResponse> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Get(`/:id`)
  @ApiOkResponse({ type: ADMIN.AddressDetailsResponse })
  getById(@Param(`id`) id: string): Promise<ADMIN.AddressDetailsResponse> {
    return this.service.repository.findById(id)
  }

  @Put(`/:id`)
  @ApiOkResponse({ type: ADMIN.AddressDetailsResponse })
  updateBillingDetails(@Param(`id`) id: string, @Body() body: ADMIN.AddressDetailsUpdate): Promise<ADMIN.AddressDetailsResponse> {
    return this.service.repository.updateById(id, body)
  }

  @Delete(`/:id`)
  @ApiOkResponse({ type: Boolean })
  deleteById(@Param(`id`) id: string): Promise<boolean> {
    return this.service.repository.deleteById(id)
  }
}
