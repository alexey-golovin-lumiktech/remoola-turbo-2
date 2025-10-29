import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { type Request } from 'express';

import { parsedEnvs } from '@remoola/env';

import { DocumentsService } from './documents.service';
import { UploadDocument, PresignedResponse, DocumentListItem, CreatePresignedBody } from './dto';

@Controller({ path: `consumer/documents`, version: `1` })
export class DocumentsController {
  private s3 = new S3Client({ region: parsedEnvs.AWS_REGION });

  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOkResponse({ type: DocumentListItem, isArray: true })
  list(@Req() req: Request & { user: any }, @Query(`clientId`) clientId?: string) {
    const sub = req.user?.[`sub`] || clientId;
    return this.documentsService.listByClient(sub);
  }

  @Post()
  @ApiOkResponse({ type: DocumentListItem, isArray: false })
  upload(@Body() body: UploadDocument) {
    return this.documentsService.upload(body);
  }

  @Post(`presigned`)
  @ApiOkResponse({ type: PresignedResponse, isArray: false })
  async presigned(@Body() body: CreatePresignedBody) {
    const key = body.key ?? `uploads/${Date.now()}-${encodeURIComponent(body.filename)}`;
    const params = { Bucket: parsedEnvs.S3_BUCKET, Key: key, ContentType: body.contentType };
    const url = await getSignedUrl(this.s3, new PutObjectCommand(params), { expiresIn: 60 });
    return { url, fileUrl: `${parsedEnvs.S3_PUBLIC_BASE}/${key}`, method: `PUT` } satisfies PresignedResponse;
  }
}
