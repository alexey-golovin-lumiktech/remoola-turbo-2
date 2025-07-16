import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { IConsumerModel, IPaymentMethodModel } from '@wirebill/shared-common/models'
import { ReqQuery } from '@wirebill/shared-common/types'

import { CONSUMER } from '../../../dtos'
import { ReqAuthIdentity } from '../../../guards/auth.guard'
import { TransformResponse } from '../../../interceptors'
import { ReqQueryTransformPipe } from '../../pipes'

import { PaymentMethodService } from './payment-method.service'

@ApiTags(`consumer`)
@ApiTags(`payment-methods`)
@ApiBearerAuth()
@Controller(`consumer/payment-methods`)
export class PaymentMethodController {
  constructor(@Inject(PaymentMethodService) private readonly service: PaymentMethodService) {}

  @Get()
  @TransformResponse(CONSUMER.PaymentMethodListResponse)
  @ApiOkResponse({ type: CONSUMER.PaymentMethodListResponse })
  getConsumerPaymentMethodsList(
    @ReqAuthIdentity() identity: IConsumerModel,
    @Query(new ReqQueryTransformPipe()) query: ReqQuery<IPaymentMethodModel>,
  ): Promise<CONSUMER.PaymentMethodListResponse> {
    Object.assign(query, { filter: { ...query?.filter, consumerId: identity.id, deletedAt: null } })
    return this.service.findAndCountAll(query)
  }

  @Post()
  @TransformResponse(CONSUMER.PaymentMethodResponse)
  @ApiOkResponse({ type: CONSUMER.PaymentMethodResponse })
  createConsumerPaymentMethod(@ReqAuthIdentity() identity: IConsumerModel, @Body() body: CONSUMER.PaymentMethodCreate) {
    return this.service.repository.create({ ...body, consumerId: identity.id })
  }

  @Get(`/:id`)
  @TransformResponse(CONSUMER.PaymentMethodResponse)
  @ApiOkResponse({ type: CONSUMER.PaymentMethodResponse })
  getConsumerPaymentMethodById(
    @ReqAuthIdentity() identity: IConsumerModel,
    @Param(`id`) id: string,
  ): Promise<CONSUMER.PaymentMethodResponse> {
    return this.service.repository.findOne({ id, consumerId: identity.id })
  }

  @Patch(`/:id`)
  @TransformResponse(CONSUMER.PaymentMethodResponse)
  @ApiOkResponse({ type: CONSUMER.PaymentMethodResponse })
  updateConsumerPaymentMethod(
    @ReqAuthIdentity() identity: IConsumerModel,
    @Param(`id`) id: string,
    @Body() body: CONSUMER.PaymentMethodUpdate,
  ) {
    return this.service.repository.update({ id, consumerId: identity.id }, body)
  }

  @Delete(`/:id`)
  @TransformResponse(CONSUMER.PaymentMethodResponse)
  @ApiOkResponse({ type: CONSUMER.PaymentMethodResponse })
  deleteConsumerPaymentMethod(@ReqAuthIdentity() identity: IConsumerModel, @Param(`id`) id: string) {
    return this.service.repository.softDelete({ id, consumerId: identity.id })
  }
}
