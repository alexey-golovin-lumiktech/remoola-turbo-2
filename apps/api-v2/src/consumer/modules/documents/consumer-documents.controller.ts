import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
  UploadedFiles,
  UseInterceptors,
  Param,
  Req,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import express from 'express';

import { ConsumerDocumentsService } from './consumer-documents.service';
import { AttachDocuments, BulkDeleteDocuments, SetTags } from './dto/document.dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity, type IIdentityContext } from '../../../common';
import { resolveRequestBaseUrl } from '../../../shared/request-base-url';

class ConsumerDocumentsListQuery {
  @Expose()
  @IsString()
  @IsOptional()
  kind?: string;

  @Expose()
  @IsString()
  @IsOptional()
  contactId?: string;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  pageSize?: number;
}

class UploadDocumentsBody {
  @Expose()
  @IsString()
  @IsOptional()
  paymentRequestId?: string;
}

@ApiTags(`Consumer: documents`)
@Controller(`consumer/documents`)
@UseGuards(JwtAuthGuard)
export class ConsumerDocumentsController {
  constructor(private readonly documents: ConsumerDocumentsService) {}

  @Get()
  list(
    @Identity() consumer: IIdentityContext,
    @Query() query: ConsumerDocumentsListQuery,
    @Req() req?: express.Request,
  ) {
    return this.documents.getDocuments(
      consumer.id,
      query.kind,
      query.page,
      query.pageSize,
      req ? resolveRequestBaseUrl(req) : undefined,
      query.contactId,
    );
  }

  @Get(`:id/download`)
  async download(
    @Identity() consumer: IIdentityContext,
    @Param(`id`) id: string,
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
  upload(
    @Identity() consumer: IIdentityContext,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: UploadDocumentsBody,
    @Req() req: express.Request,
  ) {
    return this.documents.uploadDocuments(consumer.id, files, resolveRequestBaseUrl(req), body.paymentRequestId);
  }

  @Post(`bulk-delete`)
  bulkDelete(@Identity() consumer: IIdentityContext, @Body() body: BulkDeleteDocuments) {
    return this.documents.bulkDeleteDocuments(consumer.id, body.ids ?? body.documentIds ?? []);
  }

  @Delete(`:id`)
  delete(@Identity() consumer: IIdentityContext, @Param(`id`) id: string) {
    return this.documents.deleteDocument(consumer.id, id);
  }

  @Post(`attach-to-payment`)
  attachToPayment(@Identity() consumer: IIdentityContext, @Body() body: AttachDocuments) {
    return this.documents.attachToPayment(consumer.id, body.paymentRequestId, body.resourceIds);
  }

  @Delete(`payment-attachments/:paymentRequestId/:resourceId`)
  detachFromPayment(
    @Identity() consumer: IIdentityContext,
    @Param(`paymentRequestId`) paymentRequestId: string,
    @Param(`resourceId`) resourceId: string,
  ) {
    return this.documents.detachFromPayment(consumer.id, paymentRequestId, resourceId);
  }

  @Post(`:id/tags`)
  setTags(@Identity() consumer: IIdentityContext, @Body() body: SetTags, @Param(`id`) resourceId: string) {
    return this.documents.setTags(consumer.id, resourceId, body.tags);
  }
}
