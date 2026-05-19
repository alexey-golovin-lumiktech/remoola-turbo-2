import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCookieAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import {
  AdminV2ReadThrottle,
  Identity,
  type IIdentityContext,
  PlainObjectResponseContract,
  RequestMeta,
  type RequestMeta as RequestMetaPayload,
} from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import {
  DisablePaymentMethodBody,
  DuplicateEscalatePaymentMethodBody,
  PaymentMethodsListQuery,
  RemoveDefaultPaymentMethodBody,
} from './admin-v2-payment-methods.dto';
import { AdminV2PaymentMethodsService } from './admin-v2-payment-methods.service';

@ApiCookieAuth()
@ApiTags(`Admin v2: Payment Methods`)
@PlainObjectResponseContract(
  `Admin v2 payment method routes return plain objects governed by @remoola/api-types contracts.`,
)
@AdminV2ReadThrottle()
@Controller(`admin-v2/payment-methods`)
export class AdminV2PaymentMethodsController {
  constructor(
    private readonly service: AdminV2PaymentMethodsService,
    private readonly accessService: AdminV2AccessService,
  ) {}

  @Get()
  @ApiQuery({ name: `page`, required: false, type: Number })
  @ApiQuery({ name: `pageSize`, required: false, type: Number })
  @ApiQuery({ name: `consumerId`, required: false })
  @ApiQuery({ name: `type`, required: false })
  @ApiQuery({ name: `defaultSelected`, required: false, type: Boolean })
  @ApiQuery({ name: `fingerprint`, required: false })
  @ApiQuery({ name: `includeDeleted`, required: false, type: Boolean })
  @ApiBadRequestResponse({ description: `Invalid query parameter shape or type.` })
  async listPaymentMethods(@Identity() admin: IIdentityContext, @Query() query: PaymentMethodsListQuery) {
    await this.accessService.assertCapability(admin, `payment_methods.read`);
    return this.service.listPaymentMethods({
      page: query.page,
      pageSize: query.pageSize,
      consumerId: query.consumerId,
      type: query.type,
      defaultSelected: query.defaultSelected,
      fingerprint: query.fingerprint,
      includeDeleted: query.includeDeleted === true,
    });
  }

  @Get(`:id`)
  @ApiParam({ name: `id`, format: `uuid`, description: `Payment method id` })
  @ApiBadRequestResponse({ description: `Invalid payment method id.` })
  async getPaymentMethodCase(@Identity() admin: IIdentityContext, @Param(`id`, ParseUUIDPipe) id: string) {
    await this.accessService.assertCapability(admin, `payment_methods.read`);
    return this.service.getPaymentMethodCase(id);
  }

  @Post(`:id/disable`)
  @ApiParam({ name: `id`, format: `uuid`, description: `Payment method id` })
  @ApiBadRequestResponse({ description: `Invalid payment method id or disable body.` })
  async disablePaymentMethod(
    @Identity() admin: IIdentityContext,
    @Param(`id`, ParseUUIDPipe) id: string,
    @Body() body: DisablePaymentMethodBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `payment_methods.manage`);
    return this.service.disablePaymentMethod(id, admin.id, body, meta);
  }

  @Post(`:id/remove-default`)
  @ApiParam({ name: `id`, format: `uuid`, description: `Payment method id` })
  @ApiBadRequestResponse({ description: `Invalid payment method id or remove-default body.` })
  async removeDefaultPaymentMethod(
    @Identity() admin: IIdentityContext,
    @Param(`id`, ParseUUIDPipe) id: string,
    @Body() body: RemoveDefaultPaymentMethodBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `payment_methods.manage`);
    return this.service.removeDefaultPaymentMethod(id, admin.id, body, meta);
  }

  @Post(`:id/duplicate-escalate`)
  @ApiParam({ name: `id`, format: `uuid`, description: `Payment method id` })
  @ApiBadRequestResponse({ description: `Invalid payment method id or duplicate-escalate body.` })
  async duplicateEscalatePaymentMethod(
    @Identity() admin: IIdentityContext,
    @Param(`id`, ParseUUIDPipe) id: string,
    @Body() body: DuplicateEscalatePaymentMethodBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `payment_methods.manage`);
    return this.service.escalateDuplicatePaymentMethod(id, admin.id, body, meta);
  }
}
