import { Body, Controller, Get, Inject, Param, Put, Query, Response } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Response as IExpressResponse } from 'express'

import { IPersonalDetailsModel } from '@wirebill/shared-common/models'
import { ReqQuery } from '@wirebill/shared-common/types'

import { ADMIN } from '../../../dtos'
import { ListResponse } from '../../../dtos/common'
import { TransformResponse } from '../../../interceptors'
import { ReqQueryTransformPipe } from '../../pipes'

import { AdminPersonalDetailsService } from './admin-personal-details.service'

@ApiTags(`admin`)
@Controller(`admin/personal-details`)
export class AdminPersonalDetailsController {
  constructor(@Inject(AdminPersonalDetailsService) private readonly service: AdminPersonalDetailsService) {}

  @Get(`/`)
  @TransformResponse(ListResponse<ADMIN.PersonalDetailsResponse>)
  @ApiOkResponse({ type: ListResponse<ADMIN.PersonalDetailsResponse> })
  async findAndCountAll(
    @Query(new ReqQueryTransformPipe()) query: ReqQuery<IPersonalDetailsModel>,
    @Response() res: IExpressResponse,
  ): Promise<ListResponse<ADMIN.PersonalDetailsResponse>> {
    const result = await this.service.repository.findAndCountAll(query)
    res.set(`Content-Range`, result.count.toString())
    res.send(result.data)
    return result
  }

  @Get(`/:personalDetailsId`)
  @ApiOkResponse({ type: ADMIN.PersonalDetailsResponse })
  getById(@Param(`personalDetailsId`) personalDetailsId: string): Promise<ADMIN.PersonalDetailsResponse> {
    return this.service.repository.findById(personalDetailsId)
  }

  @Put(`/:personalDetailsId`)
  @ApiOkResponse({ type: ADMIN.PersonalDetailsResponse })
  updateById(@Param(`personalDetailsId`) personalDetailsId: string, @Body() body: unknown): Promise<ADMIN.PersonalDetailsResponse> {
    return this.service.repository.updateById(personalDetailsId, body)
  }
}
