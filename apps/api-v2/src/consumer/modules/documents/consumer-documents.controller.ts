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
import express from 'express';

import { type ConsumerModel } from '@remoola/database-2';

import { ConsumerDocumentsService } from './consumer-documents.service';
import { AttachDocuments, BulkDeleteDocuments, SetTags } from './dto/document.dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity } from '../../../common';
import { resolveRequestBaseUrl } from '../../../shared/request-base-url';

@ApiTags(`Consumer: documents`)
@Controller(`consumer/documents`)
@UseGuards(JwtAuthGuard)
export class ConsumerDocumentsController {
  constructor(private readonly documents: ConsumerDocumentsService) {}

  @Get()
  list(
    @Identity() consumer: ConsumerModel,
    @Query(`kind`) kind?: string,
    @Query(`contactId`) contactId?: string,
    @Query(`page`) page?: string,
    @Query(`pageSize`) pageSize?: string,
    @Req() req?: express.Request,
  ) {
    return this.documents.getDocuments(
      consumer.id,
      kind,
      page ? Number(page) : undefined,
      pageSize ? Number(pageSize) : undefined,
      req ? resolveRequestBaseUrl(req) : undefined,
      contactId,
    );
  }

  @Get(`:id/download`)
  async download(
    @Identity() consumer: ConsumerModel,
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
    @Identity() consumer: ConsumerModel,
    @UploadedFiles() files: Express.Multer.File[],
    @Body(`paymentRequestId`) paymentRequestId: string | undefined,
    @Req() req: express.Request,
  ) {
    return this.documents.uploadDocuments(consumer.id, files, resolveRequestBaseUrl(req), paymentRequestId);
  }

  @Post(`bulk-delete`)
  bulkDelete(@Identity() consumer: ConsumerModel, @Body() body: BulkDeleteDocuments) {
    return this.documents.bulkDeleteDocuments(consumer.id, body.ids ?? body.documentIds ?? []);
  }

  @Delete(`:id`)
  delete(@Identity() consumer: ConsumerModel, @Param(`id`) id: string) {
    return this.documents.deleteDocument(consumer.id, id);
  }

  @Post(`attach-to-payment`)
  attachToPayment(@Identity() consumer: ConsumerModel, @Body() body: AttachDocuments) {
    return this.documents.attachToPayment(consumer.id, body.paymentRequestId, body.resourceIds);
  }

  @Delete(`payment-attachments/:paymentRequestId/:resourceId`)
  detachFromPayment(
    @Identity() consumer: ConsumerModel,
    @Param(`paymentRequestId`) paymentRequestId: string,
    @Param(`resourceId`) resourceId: string,
  ) {
    return this.documents.detachFromPayment(consumer.id, paymentRequestId, resourceId);
  }

  @Post(`:id/tags`)
  setTags(@Identity() consumer: ConsumerModel, @Body() body: SetTags, @Param(`id`) resourceId: string) {
    return this.documents.setTags(consumer.id, resourceId, body.tags);
  }
}
