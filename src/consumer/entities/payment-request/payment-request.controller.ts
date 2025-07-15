import { BadRequestException, Body, Controller, Get, Inject, Param, Post, Query, UploadedFiles, UseInterceptors } from '@nestjs/common'
import { AnyFilesInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { IConsumerModel, IPaymentRequestModel } from '@wirebill/shared-common/models'
import { ReqQuery, ReqQueryTimelineFilter } from '@wirebill/shared-common/types'

import { ParseJsonPipe, ReqQueryTransformPipe } from '../../../consumer/pipes'
import { CONSUMER } from '../../../dtos'
import { envs } from '../../../envs'
import { ReqAuthIdentity } from '../../../guards/auth.guard'
import { TransformResponse } from '../../../interceptors'

import { PaymentRequestService } from './payment-request.service'

@ApiTags(`consumer`)
@ApiTags(`payment-requests`)
@ApiBearerAuth()
@Controller(`consumer/payment-requests`)
export class PaymentRequestController {
  constructor(@Inject(PaymentRequestService) private readonly service: PaymentRequestService) {}

  @Get(`/sent`)
  @ApiOkResponse({ type: CONSUMER.PaymentRequestListResponse })
  @TransformResponse(CONSUMER.PaymentRequestListResponse)
  getSentPaymentRequestsList(
    @ReqAuthIdentity() identity: IConsumerModel,
    @Query(new ReqQueryTransformPipe()) query: ReqQuery<IPaymentRequestModel>,
    @Query(`timelineFilter`, ParseJsonPipe) timelineFilter: Unassignable<ReqQueryTimelineFilter<IPaymentRequestModel>>,
  ): Promise<CONSUMER.PaymentRequestListResponse> {
    return this.service.getSentPaymentRequestsList(identity.id, query, timelineFilter)
  }

  @Get(`/received`)
  @ApiOkResponse({ type: CONSUMER.PaymentRequestListResponse })
  @TransformResponse(CONSUMER.PaymentRequestListResponse)
  getReceivedPaymentRequestsList(
    @ReqAuthIdentity() identity: IConsumerModel,
    @Query(new ReqQueryTransformPipe()) query: ReqQuery<IPaymentRequestModel>,
    @Query(`timelineFilter`, ParseJsonPipe) timelineFilter: Unassignable<ReqQueryTimelineFilter<IPaymentRequestModel>>,
  ): Promise<CONSUMER.PaymentRequestListResponse> {
    return this.service.getReceivedPaymentRequestsList(identity.id, query, timelineFilter)
  }

  @Get(`/history`)
  @ApiOkResponse({ type: CONSUMER.PaymentRequestListResponse })
  @TransformResponse(CONSUMER.PaymentRequestListResponse)
  getPaymentRequestsHistory(
    @ReqAuthIdentity() identity: IConsumerModel,
    @Query(new ReqQueryTransformPipe()) query: ReqQuery<IPaymentRequestModel>,
    @Query(`timelineFilter`, ParseJsonPipe) timelineFilter: Unassignable<ReqQueryTimelineFilter<IPaymentRequestModel>>,
  ): Promise<CONSUMER.PaymentRequestListResponse> {
    return this.service.getPaymentRequestsHistory(identity.id, query, timelineFilter)
  }

  @Post(`/pay-to-contact`)
  @ApiOkResponse({ type: CONSUMER.PaymentRequestResponse })
  @TransformResponse(CONSUMER.PaymentRequestResponse)
  @UseInterceptors(AnyFilesInterceptor())
  payToContact(
    @UploadedFiles() files: Array<Express.Multer.File> = [],
    @Body() body: CONSUMER.PaymentRequestPayToContact,
    @ReqAuthIdentity() identity: IConsumerModel,
  ): Promise<CONSUMER.PaymentRequestResponse> | never {
    this.checkUploadedFilesToMaxSize(files)
    return this.service.payToContact({ identity, files, body })
  }

  private checkUploadedFilesToMaxSize(files: Array<Express.Multer.File>) {
    const MAX_SIZE = envs.AWS_FILE_UPLOAD_MAX_SIZE_BYTES

    const oversize = files.reduce<Array<string>>((acc, { size, filename, originalname }) => {
      if (size > MAX_SIZE) acc.push(`${Math.ceil(size / 1000000)}_MB ${filename || originalname}`)
      return acc
    }, [])
    if (oversize.length == 0) return
    const message = `File size limit exceeded (max: ${MAX_SIZE / 1000000}_MB).`
    throw new BadRequestException({ message, details: oversize, statusCode: 400, error: `Bad Request` })
  }

  @Get(`/:paymentRequestId`)
  @ApiOkResponse({ type: CONSUMER.PaymentRequestResponse })
  @TransformResponse(CONSUMER.PaymentRequestResponse)
  getConsumerPaymentRequestById(
    @ReqAuthIdentity() identity: IConsumerModel,
    @Param(`paymentRequestId`) paymentRequestId: string,
  ): Promise<CONSUMER.PaymentRequestResponse> {
    return this.service.getConsumerPaymentRequestById(identity.id, paymentRequestId)
  }
}
