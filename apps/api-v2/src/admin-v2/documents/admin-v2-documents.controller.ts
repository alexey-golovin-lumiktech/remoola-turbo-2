import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, StreamableFile } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Expose, Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import express from 'express';

import {
  type AdminV2DocumentBulkTagBody,
  type AdminV2DocumentBulkTagResource,
  type AdminV2DocumentRetagBody,
  type AdminV2DocumentTagCreateBody,
  type AdminV2DocumentTagDeleteBody,
  type AdminV2DocumentTagUpdateBody,
} from '@remoola/api-types';

import { Identity, type IIdentityContext, RequestMeta, type RequestMeta as RequestMetaPayload } from '../../common';
import { resolveRequestBaseUrl } from '../../shared/request-base-url';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { ConfirmedVersionedMutationBody, VersionedMutationBody } from '../admin-v2-common.dto';
import { AdminDocumentTagService } from './admin-document-tag.service';
import { AdminDocumentTaggerService } from './admin-document-tagger.service';
import { AdminDocumentService } from './admin-document.service';

class DocumentTagCreateBody implements AdminV2DocumentTagCreateBody {
  @Expose()
  @IsString()
  name!: string;
}

class DocumentTagUpdateBody extends VersionedMutationBody implements AdminV2DocumentTagUpdateBody {
  @Expose()
  @IsString()
  name!: string;
}

class DocumentTagDeleteBody extends ConfirmedVersionedMutationBody implements AdminV2DocumentTagDeleteBody {}

class DocumentRetagBody extends VersionedMutationBody implements AdminV2DocumentRetagBody {
  @Expose()
  @IsArray()
  @IsString({ each: true })
  tagIds!: string[];
}

class BulkTagResource extends VersionedMutationBody implements AdminV2DocumentBulkTagResource {
  @Expose()
  @IsString()
  resourceId!: string;
}

class DocumentBulkTagBody implements AdminV2DocumentBulkTagBody {
  @Expose()
  @IsArray()
  @IsString({ each: true })
  tagIds!: string[];

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkTagResource)
  resources!: BulkTagResource[];
}

class AdminDocumentsListQuery {
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

  @Expose()
  @IsString()
  @IsOptional()
  q?: string;

  @Expose()
  @IsString()
  @IsOptional()
  consumerId?: string;

  @Expose()
  @IsString()
  @IsOptional()
  access?: string;

  @Expose()
  @IsString()
  @IsOptional()
  mimetype?: string;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  sizeMin?: number;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  sizeMax?: number;

  @Expose()
  @IsString()
  @IsOptional()
  createdFrom?: string;

  @Expose()
  @IsString()
  @IsOptional()
  createdTo?: string;

  @Expose()
  @IsString()
  @IsOptional()
  paymentRequestId?: string;

  @Expose()
  @IsString()
  @IsOptional()
  tag?: string;

  @Expose()
  @IsString()
  @IsOptional()
  tagId?: string;

  @Expose()
  @Transform(({ value }) => value === true || value === `true`)
  @IsBoolean()
  @IsOptional()
  includeDeleted?: boolean;
}

@ApiCookieAuth()
@ApiTags(`Admin v2: Documents`)
@Throttle({ default: { limit: 500, ttl: 60000 } })
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
    @Query() query: AdminDocumentsListQuery,
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
  async download(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
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
  async getDocumentCase(@Identity() admin: IIdentityContext, @Param(`id`) id: string, @Req() req: express.Request) {
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
  async updateTag(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: DocumentTagUpdateBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `documents.manage`);
    return this.tagService.updateTag(id, admin.id, body, meta);
  }

  @Delete(`tags/:id`)
  async deleteTag(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: DocumentTagDeleteBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `documents.manage`);
    return this.tagService.deleteTag(id, admin.id, body, meta);
  }

  @Post(`:id/retag`)
  async retagDocument(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
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
