import { Body, Controller, Get, Inject, Param, Put, Query, Response } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response as IExpressResponse } from 'express'

import { IAddressDetailsModel } from '@wirebill/shared-common/models'
import { ListQuery } from '@wirebill/shared-common/types'

import { ADMIN } from '../../../dtos'
import { ListResponse } from '../../../dtos/common'
import { TransformResponse } from '../../../interceptors'
import { AdminPanelQueryTransformPipe } from '../../pipes'

import { AdminAddressDetailsService } from './admin-address-details.service'

@ApiTags(`admin`)
@Controller(`admin/address-details`)
export class AdminAddressDetailsController {
  constructor(@Inject(AdminAddressDetailsService) private readonly service: AdminAddressDetailsService) {}

  @Get(`/`)
  @TransformResponse(ListResponse<ADMIN.AddressDetailsResponse>)
  @ApiOkResponse({ type: ListResponse<ADMIN.AddressDetailsResponse> })
  async findAndCountAll(
    @Query(new AdminPanelQueryTransformPipe()) query: ListQuery<IAddressDetailsModel>,
    @Response() res: IExpressResponse,
  ): Promise<ListResponse<ADMIN.AddressDetailsResponse>> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Get(`/:addressDetailsId`)
  @ApiOkResponse({ type: ADMIN.AddressDetailsResponse })
  getById(@Param(`addressDetailsId`) addressDetailsId: string): Promise<ADMIN.AddressDetailsResponse> {
    return this.service.repository.findById(addressDetailsId)
  }

  @Put(`/:addressDetailsId`)
  @ApiOkResponse({ type: ADMIN.AddressDetailsResponse })
  updateBillingDetails(
    @Param(`addressDetailsId`) addressDetailsId: string,
    @Body() body: ADMIN.UpdateAddressDetails,
  ): Promise<ADMIN.AddressDetailsResponse> {
    return this.service.repository.updateById(addressDetailsId, body)
  }
}
