import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
  Param,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBadRequestResponse, ApiOkResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import express from 'express';

import {
  consumerDocumentsResponseSchema,
  consumerDocumentsUploadResponseSchema,
  consumerSuccessResponseSchema,
  type ConsumerDocumentsResponse,
  type ConsumerDocumentsUploadResponse,
  type ConsumerSuccessResponse,
} from '@remoola/api-types';

import { ConsumerDocumentsService } from './consumer-documents.service';
import {
  AttachDocuments,
  BulkDeleteDocuments,
  ConsumerDocumentsListResponse,
  ConsumerDocumentsListWithPagingQuery,
  SetTags,
  UploadDocumentsBody,
} from './dto/document.dto';
import { Identity, type IIdentityContext } from '../../../common';
import { resolveRequestBaseUrl } from '../../../shared/request-base-url';
import { toConsumerWireContract } from '../../consumer-wire-contract';

@ApiTags(`Consumer: documents`)
@Controller(`consumer/documents`)
export class ConsumerDocumentsController {
  constructor(private readonly documents: ConsumerDocumentsService) {}

  @Get()
  @ApiQuery({ name: `kind`, required: false })
  @ApiQuery({ name: `contactId`, required: false })
  @ApiQuery({ name: `page`, required: false, type: Number })
  @ApiQuery({ name: `pageSize`, required: false, type: Number })
  @ApiBadRequestResponse({ description: `Invalid query parameter shape or type.` })
  @ApiOkResponse({ type: ConsumerDocumentsListResponse })
  async list(
    @Identity() consumer: IIdentityContext,
    @Query() query: ConsumerDocumentsListWithPagingQuery,
    @Req() req?: express.Request,
  ): Promise<ConsumerDocumentsResponse> {
    return toConsumerWireContract(
      consumerDocumentsResponseSchema,
      await this.documents.getDocuments(
        consumer.id,
        query.kind,
        query.page,
        query.pageSize,
        req ? resolveRequestBaseUrl(req) : undefined,
        query.contactId,
      ),
    );
  }

  @Get(`:id/download`)
  @ApiParam({ name: `id`, format: `uuid`, description: `Document resource id` })
  @ApiBadRequestResponse({ description: `Invalid document resource id.` })
  async download(
    @Identity() consumer: IIdentityContext,
    @Param(`id`, ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const file = await this.documents.openDownload(consumer.id, id);

    if (file.contentType) {
      res.setHeader(`Content-Type`, file.contentType);
    }
    if (file.contentLength != null) {
      res.setHeader(`Content-Length`, String(file.contentLength));
    }

    res.setHeader(`Cache-Control`, `private, no-store`);
    res.setHeader(`Content-Disposition`, `inline; filename*=UTF-8''${encodeURIComponent(file.filename)}`);

    return new StreamableFile(file.stream);
  }

  @Post(`upload`)
  @UseInterceptors(FilesInterceptor(`files`))
  async upload(
    @Identity() consumer: IIdentityContext,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: UploadDocumentsBody,
    @Req() req: express.Request,
  ): Promise<ConsumerDocumentsUploadResponse> {
    return toConsumerWireContract(
      consumerDocumentsUploadResponseSchema,
      await this.documents.uploadDocuments(consumer.id, files, resolveRequestBaseUrl(req), body.paymentRequestId),
    );
  }

  @Post(`bulk-delete`)
  async bulkDelete(
    @Identity() consumer: IIdentityContext,
    @Body() body: BulkDeleteDocuments,
  ): Promise<ConsumerSuccessResponse> {
    return toConsumerWireContract(
      consumerSuccessResponseSchema,
      await this.documents.bulkDeleteDocuments(consumer.id, body.ids ?? body.documentIds ?? []),
    );
  }

  @Delete(`:id`)
  @ApiParam({ name: `id`, format: `uuid`, description: `Document resource id` })
  @ApiBadRequestResponse({ description: `Invalid document resource id.` })
  async delete(
    @Identity() consumer: IIdentityContext,
    @Param(`id`, ParseUUIDPipe) id: string,
  ): Promise<ConsumerSuccessResponse> {
    return toConsumerWireContract(consumerSuccessResponseSchema, await this.documents.deleteDocument(consumer.id, id));
  }

  @Post(`attach-to-payment`)
  async attachToPayment(
    @Identity() consumer: IIdentityContext,
    @Body() body: AttachDocuments,
  ): Promise<ConsumerSuccessResponse> {
    return toConsumerWireContract(
      consumerSuccessResponseSchema,
      await this.documents.attachToPayment(consumer.id, body.paymentRequestId, body.resourceIds),
    );
  }

  @Delete(`payment-attachments/:paymentRequestId/:resourceId`)
  @ApiParam({ name: `paymentRequestId`, format: `uuid`, description: `Payment request id` })
  @ApiParam({ name: `resourceId`, format: `uuid`, description: `Document resource id` })
  @ApiBadRequestResponse({ description: `Invalid payment request id or document resource id.` })
  async detachFromPayment(
    @Identity() consumer: IIdentityContext,
    @Param(`paymentRequestId`, ParseUUIDPipe) paymentRequestId: string,
    @Param(`resourceId`, ParseUUIDPipe) resourceId: string,
  ): Promise<ConsumerSuccessResponse> {
    return toConsumerWireContract(
      consumerSuccessResponseSchema,
      await this.documents.detachFromPayment(consumer.id, paymentRequestId, resourceId),
    );
  }

  @Post(`:id/tags`)
  @ApiParam({ name: `id`, format: `uuid`, description: `Document resource id` })
  @ApiBadRequestResponse({ description: `Invalid document resource id.` })
  async setTags(
    @Identity() consumer: IIdentityContext,
    @Body() body: SetTags,
    @Param(`id`, ParseUUIDPipe) resourceId: string,
  ): Promise<ConsumerSuccessResponse> {
    return toConsumerWireContract(
      consumerSuccessResponseSchema,
      await this.documents.setTags(consumer.id, resourceId, body.tags),
    );
  }
}
