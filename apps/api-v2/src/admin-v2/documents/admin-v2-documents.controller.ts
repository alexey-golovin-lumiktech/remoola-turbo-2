import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Expose, Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import express from 'express';

import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity, type IIdentityContext } from '../../common';
import { resolveRequestBaseUrl } from '../../shared/request-base-url';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2DocumentsService } from './admin-v2-documents.service';

function requestMeta(req: express.Request) {
  const ipAddress = req.ip ?? req.headers[`x-forwarded-for`];
  const userAgent = req.headers[`user-agent`];
  const idempotencyKey = req.headers[`idempotency-key`];
  return {
    ipAddress: typeof ipAddress === `string` ? ipAddress : Array.isArray(ipAddress) ? ipAddress[0] : null,
    userAgent: typeof userAgent === `string` ? userAgent : null,
    idempotencyKey:
      typeof idempotencyKey === `string` ? idempotencyKey : Array.isArray(idempotencyKey) ? idempotencyKey[0] : null,
  };
}

class DocumentTagCreateBody {
  @Expose()
  @IsString()
  name!: string;
}

class DocumentTagUpdateBody {
  @Expose()
  @IsString()
  name!: string;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  version!: number;
}

class DocumentTagDeleteBody {
  @Expose()
  @Transform(({ value }) => value === true || value === `true`)
  @IsBoolean()
  confirmed!: boolean;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  version!: number;
}

class DocumentRetagBody {
  @Expose()
  @Type(() => Number)
  @IsNumber()
  version!: number;

  @Expose()
  @IsArray()
  @IsString({ each: true })
  tagIds!: string[];
}

class BulkTagResource {
  @Expose()
  @IsString()
  resourceId!: string;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  version!: number;
}

class DocumentBulkTagBody {
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

@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
@ApiTags(`Admin v2: Documents`)
@Throttle({ default: { limit: 500, ttl: 60000 } })
@Controller(`admin-v2/documents`)
export class AdminV2DocumentsController {
  constructor(
    private readonly service: AdminV2DocumentsService,
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
    return this.service.listTags();
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
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `documents.manage`);
    return this.service.createTag(admin.id, body, requestMeta(req));
  }

  @Patch(`tags/:id`)
  async updateTag(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: DocumentTagUpdateBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `documents.manage`);
    return this.service.updateTag(id, admin.id, body, requestMeta(req));
  }

  @Delete(`tags/:id`)
  async deleteTag(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: DocumentTagDeleteBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `documents.manage`);
    return this.service.deleteTag(id, admin.id, body, requestMeta(req));
  }

  @Post(`:id/retag`)
  async retagDocument(
    @Identity() admin: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: DocumentRetagBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `documents.manage`);
    return this.service.retagDocument(id, admin.id, body, requestMeta(req));
  }

  @Post(`bulk-tag`)
  async bulkTagDocuments(
    @Identity() admin: IIdentityContext,
    @Body() body: DocumentBulkTagBody,
    @Req() req: express.Request,
  ) {
    await this.accessService.assertCapability(admin, `documents.manage`);
    return this.service.bulkTagDocuments(admin.id, body, requestMeta(req));
  }
}
