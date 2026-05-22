import { Body, Controller, Delete, Get, Patch, Post, Query, Req, Res, StreamableFile } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import express from 'express';

import {
  AdminV2ReadThrottle,
  ApiUuidParam,
  Identity,
  type IIdentityContext,
  PlainObjectResponseContract,
  RequestMeta,
  type RequestMeta as RequestMetaPayload,
  UuidParam,
} from '../../common';
import { resolveRequestBaseUrl } from '../../shared/request-base-url';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminDocumentTagService } from './admin-document-tag.service';
import { AdminDocumentTaggerService } from './admin-document-tagger.service';
import { AdminDocumentService } from './admin-document.service';
import {
  AdminDocumentsListWithPagingQuery,
  DocumentBulkTagBody,
  DocumentRetagBody,
  DocumentTagCreateBody,
  DocumentTagDeleteBody,
  DocumentTagUpdateBody,
} from './admin-v2-documents.dto';

@ApiCookieAuth()
@ApiTags(`Admin v2: Documents`)
@PlainObjectResponseContract(`Admin v2 document routes return plain objects governed by @remoola/api-types contracts.`)
@AdminV2ReadThrottle()
@Controller(`admin-v2/documents`)
export class AdminV2DocumentsController {
  constructor(
    private readonly service: AdminDocumentService,
    private readonly tagService: AdminDocumentTagService,
    private readonly taggerService: AdminDocumentTaggerService,
    private readonly accessService: AdminV2AccessService,
  ) {}

  @Get()
  async listDocuments(
    @Identity() admin: IIdentityContext,
    @Query() query: AdminDocumentsListWithPagingQuery,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `documents.read`);
    return this.service.listDocuments({
      ...query,
      backendBaseUrl: resolveRequestBaseUrl(req),
    });
  }

  @Get(`tags`)
  async listTags(@Identity() admin: IIdentityContext) {
    await this.accessService.assertCapability(admin, `documents.read`);
    return this.tagService.listTags();
  }

  @Get(`:id/download`)
  @ApiUuidParam(`id`, `Document resource id`)
  async download(
    @Identity() admin: IIdentityContext,
    @UuidParam() id: string,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    await this.accessService.assertCapability(admin, `documents.read`);
    const file = await this.service.openDownload(id);

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

  @Get(`:id`)
  @ApiUuidParam(`id`, `Document resource id`)
  async getDocumentCase(@Identity() admin: IIdentityContext, @UuidParam() id: string, @Req() req: express.Request) {
    await this.accessService.assertCapability(admin, `documents.read`);
    return this.service.getDocumentCase(id, resolveRequestBaseUrl(req));
  }

  @Post(`tags`)
  async createTag(
    @Identity() admin: IIdentityContext,
    @Body() body: DocumentTagCreateBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `documents.manage`);
    return this.tagService.createTag(admin.id, body, meta);
  }

  @Patch(`tags/:id`)
  @ApiUuidParam(`id`, `Document tag id`)
  async updateTag(
    @Identity() admin: IIdentityContext,
    @UuidParam() id: string,
    @Body() body: DocumentTagUpdateBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `documents.manage`);
    return this.tagService.updateTag(id, admin.id, body, meta);
  }

  @Delete(`tags/:id`)
  @ApiUuidParam(`id`, `Document tag id`)
  async deleteTag(
    @Identity() admin: IIdentityContext,
    @UuidParam() id: string,
    @Body() body: DocumentTagDeleteBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `documents.manage`);
    return this.tagService.deleteTag(id, admin.id, body, meta);
  }

  @Post(`:id/retag`)
  @ApiUuidParam(`id`, `Document resource id`)
  async retagDocument(
    @Identity() admin: IIdentityContext,
    @UuidParam() id: string,
    @Body() body: DocumentRetagBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `documents.manage`);
    return this.taggerService.retagDocument(id, admin.id, body, meta);
  }

  @Post(`bulk-tag`)
  async bulkTagDocuments(
    @Identity() admin: IIdentityContext,
    @Body() body: DocumentBulkTagBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `documents.manage`);
    return this.taggerService.bulkTagDocuments(admin.id, body, meta);
  }
}
