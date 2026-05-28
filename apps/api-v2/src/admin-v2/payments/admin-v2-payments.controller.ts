import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCookieAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import {
  PAYMENT_REVERSAL_KIND,
  adminV2PaymentCaseResponseSchema,
  adminV2PaymentOperationsQueueResponseSchema,
  adminV2PaymentsListResponseSchema,
  type AdminV2PaymentCaseResponse,
  type AdminV2PaymentOperationsQueueResponse,
  type AdminV2PaymentsListResponse,
} from '@remoola/api-types';

import { AdminStepUpService } from '../../admin-auth/admin-step-up.service';
import {
  AdminV2ReadThrottle,
  ApiUuidParam,
  Identity,
  type IIdentityContext,
  PlainObjectResponseContract,
  UuidParam,
} from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { toAdminV2WireContract } from '../admin-v2-wire-contract';
import { AdminV2PaymentReversalService } from './admin-v2-payment-reversal.service';
import { PaymentRequestsQuery, PaymentReversalBody } from './admin-v2-payments.dto';
import { AdminV2PaymentsService } from './admin-v2-payments.service';

@ApiCookieAuth()
@ApiTags(`Admin v2: Payments`)
@PlainObjectResponseContract(`Admin v2 payments routes return plain objects governed by @remoola/api-types contracts.`)
@AdminV2ReadThrottle()
@Controller(`admin-v2/payments`)
export class AdminV2PaymentsController {
  constructor(
    private readonly service: AdminV2PaymentsService,
    private readonly accessService: AdminV2AccessService,
    private readonly adminStepUp: AdminStepUpService,
    private readonly adminPaymentReversalService: AdminV2PaymentReversalService,
  ) {}

  @Get()
  @ApiQuery({ name: `cursor`, required: false })
  @ApiQuery({ name: `limit`, required: false, type: Number })
  @ApiQuery({ name: `q`, required: false })
  @ApiQuery({ name: `status`, required: false })
  @ApiQuery({ name: `paymentRail`, required: false })
  @ApiQuery({ name: `currencyCode`, required: false })
  @ApiQuery({ name: `amountMin`, required: false, type: Number })
  @ApiQuery({ name: `amountMax`, required: false, type: Number })
  @ApiQuery({ name: `dueDateFrom`, required: false })
  @ApiQuery({ name: `dueDateTo`, required: false })
  @ApiQuery({ name: `createdFrom`, required: false })
  @ApiQuery({ name: `createdTo`, required: false })
  @ApiQuery({ name: `overdue`, required: false, type: Boolean })
  @ApiBadRequestResponse({ description: `Invalid query parameter shape or type.` })
  async listPaymentRequests(
    @Identity() admin: IIdentityContext,
    @Query() query: PaymentRequestsQuery,
  ): Promise<AdminV2PaymentsListResponse> {
    await this.accessService.assertCapability(admin, `payments.read`);
    return toAdminV2WireContract(
      adminV2PaymentsListResponseSchema,
      await this.service.listPaymentRequests({
        cursor: query.cursor,
        limit: query.limit,
        q: query.q,
        status: query.status,
        paymentRail: query.paymentRail,
        currencyCode: query.currencyCode,
        amountMin: query.amountMin,
        amountMax: query.amountMax,
        dueDateFrom: query.dueDateFrom,
        dueDateTo: query.dueDateTo,
        createdFrom: query.createdFrom,
        createdTo: query.createdTo,
        overdue: query.overdue === true,
      }),
    );
  }

  @Get(`operations-queue`)
  async getPaymentOperationsQueue(@Identity() admin: IIdentityContext): Promise<AdminV2PaymentOperationsQueueResponse> {
    await this.accessService.assertCapability(admin, `payments.read`);
    return toAdminV2WireContract(
      adminV2PaymentOperationsQueueResponseSchema,
      await this.service.getPaymentOperationsQueue(),
    );
  }

  @Get(`:id`)
  @ApiUuidParam(`id`, `Payment request id`)
  @ApiBadRequestResponse({ description: `Invalid payment request id.` })
  async getPaymentRequestCase(
    @Identity() admin: IIdentityContext,
    @UuidParam(`id`) id: string,
  ): Promise<AdminV2PaymentCaseResponse> {
    await this.accessService.assertCapability(admin, `payments.read`);
    return toAdminV2WireContract(adminV2PaymentCaseResponseSchema, await this.service.getPaymentRequestCase(id));
  }

  @Post(`:id/refund`)
  @ApiUuidParam(`id`, `Payment request id`)
  @ApiBadRequestResponse({ description: `Invalid payment request id or refund body.` })
  async createRefund(
    @Identity() admin: IIdentityContext,
    @UuidParam(`id`) id: string,
    @Body() body: PaymentReversalBody,
  ) {
    await this.accessService.assertCapability(admin, `payments.reverse`);
    await this.adminStepUp.verify(admin.id, body.passwordConfirmation);
    return this.adminPaymentReversalService.createReversal(
      id,
      { amount: body.amount, reason: body.reason, kind: PAYMENT_REVERSAL_KIND.REFUND },
      admin.id,
    );
  }

  @Post(`:id/chargeback`)
  @ApiUuidParam(`id`, `Payment request id`)
  @ApiBadRequestResponse({ description: `Invalid payment request id or chargeback body.` })
  async createChargeback(
    @Identity() admin: IIdentityContext,
    @UuidParam(`id`) id: string,
    @Body() body: PaymentReversalBody,
  ) {
    await this.accessService.assertCapability(admin, `payments.reverse`);
    await this.adminStepUp.verify(admin.id, body.passwordConfirmation);
    return this.adminPaymentReversalService.createReversal(
      id,
      { amount: body.amount, reason: body.reason, kind: PAYMENT_REVERSAL_KIND.CHARGEBACK },
      admin.id,
    );
  }
}
