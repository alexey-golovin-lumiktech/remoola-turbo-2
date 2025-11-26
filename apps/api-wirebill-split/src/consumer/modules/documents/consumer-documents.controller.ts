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
import express from 'express';

import { ConsumerModel } from '@remoola/database';

import { ConsumerDocumentsService } from './consumer-documents.service';
import { AttachDocumentsDto, BulkDeleteDocumentsDto, SetTagsDto } from './dto/document.dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity } from '../../../common';

@Controller(`consumer/documents`)
@UseGuards(JwtAuthGuard)
export class ConsumerDocumentsController {
  constructor(private readonly documents: ConsumerDocumentsService) {}

  @Get()
  async list(@Identity() identity: ConsumerModel, @Query(`kind`) kind?: string) {
    return this.documents.getDocuments(identity.id, kind);
  }

  @Post(`upload`)
  @UseInterceptors(FilesInterceptor(`files`))
  async upload(
    @Identity() identity: ConsumerModel,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: express.Request,
  ) {
    return this.documents.uploadDocuments(identity.id, files, req.get(`host`));
  }

  @Post(`bulk-delete`)
  async bulkDelete(@Identity() identity: ConsumerModel, @Body() dto: BulkDeleteDocumentsDto) {
    return this.documents.bulkDeleteDocuments(identity.id, dto.ids);
  }

  @Post(`attach-to-payment`)
  async attachToPayment(@Identity() identity: ConsumerModel, @Body() dto: AttachDocumentsDto) {
    return this.documents.attachToPayment(identity.id, dto.paymentRequestId, dto.resourceIds);
  }

  @Post(`:id/tags`)
  async setTags(@Identity() identity: ConsumerModel, @Body() dto: SetTagsDto, @Param(`id`) resourceId: string) {
    return this.documents.setTags(identity.id, resourceId, dto.tags);
  }
}
