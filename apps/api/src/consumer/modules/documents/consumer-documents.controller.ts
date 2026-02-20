import {
  Body,
  Controller,
  Get,
  Post,
  Query,
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

@ApiTags(`Consumer: documents`)
@Controller(`consumer/documents`)
@UseGuards(JwtAuthGuard)
export class ConsumerDocumentsController {
  constructor(private readonly documents: ConsumerDocumentsService) {}

  @Get()
  list(
    @Identity() consumer: ConsumerModel,
    @Query(`kind`) kind?: string,
    @Query(`page`) page?: string,
    @Query(`pageSize`) pageSize?: string,
  ) {
    return this.documents.getDocuments(
      consumer.id,
      kind,
      page ? Number(page) : undefined,
      pageSize ? Number(pageSize) : undefined,
    );
  }

  @Post(`upload`)
  @UseInterceptors(FilesInterceptor(`files`))
  upload(
    @Identity() consumer: ConsumerModel,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: express.Request,
  ) {
    return this.documents.uploadDocuments(consumer.id, files, req.get(`host`));
  }

  @Post(`bulk-delete`)
  bulkDelete(@Identity() consumer: ConsumerModel, @Body() body: BulkDeleteDocuments) {
    return this.documents.bulkDeleteDocuments(consumer.id, body.ids);
  }

  @Post(`attach-to-payment`)
  attachToPayment(@Identity() consumer: ConsumerModel, @Body() body: AttachDocuments) {
    return this.documents.attachToPayment(consumer.id, body.paymentRequestId, body.resourceIds);
  }

  @Post(`:id/tags`)
  setTags(@Identity() consumer: ConsumerModel, @Body() body: SetTags, @Param(`id`) resourceId: string) {
    return this.documents.setTags(consumer.id, resourceId, body.tags);
  }
}
