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
  async bulkDelete(@Identity() identity: ConsumerModel, @Body() body: BulkDeleteDocuments) {
    return this.documents.bulkDeleteDocuments(identity.id, body.ids);
  }

  @Post(`attach-to-payment`)
  async attachToPayment(@Identity() identity: ConsumerModel, @Body() body: AttachDocuments) {
    return this.documents.attachToPayment(identity.id, body.paymentRequestId, body.resourceIds);
  }

  @Post(`:id/tags`)
  async setTags(@Identity() identity: ConsumerModel, @Body() body: SetTags, @Param(`id`) resourceId: string) {
    return this.documents.setTags(identity.id, resourceId, body.tags);
  }
}
