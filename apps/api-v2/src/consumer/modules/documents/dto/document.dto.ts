import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class ConsumerDocument {
  @Expose()
  @ApiProperty({ type: String, isArray: false })
  id: string;

  @Expose()
  @ApiProperty({ type: String, isArray: false })
  name: string;

  @Expose()
  @ApiProperty({ type: Number, isArray: false })
  size: number;

  @Expose()
  @ApiProperty({ type: String, isArray: false })
  createdAt: string;

  @Expose()
  @ApiProperty({ type: String, isArray: false })
  downloadUrl: string;

  @Expose()
  @ApiProperty({ type: String, isArray: false })
  mimetype: string | null;

  @Expose()
  @ApiProperty({ type: String, isArray: false })
  kind: string; // GENERAL | PAYMENT | COMPLIANCE | CONTRACT

  @Expose()
  @ApiProperty({ type: String, isArray: true })
  tags: string[];
}

export class BulkDeleteDocuments {
  @Expose()
  @ApiProperty({ type: String, isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ids?: string[];

  @Expose()
  @ApiProperty({ type: String, isArray: true, required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentIds?: string[];
}

export class AttachDocuments {
  @Expose()
  @ApiProperty({ type: String, isArray: false })
  @IsString()
  paymentRequestId: string;
  @Expose()
  @ApiProperty({ type: String, isArray: true })
  @IsArray()
  @IsString({ each: true })
  resourceIds: string[];
}

export class SetTags {
  @Expose()
  @ApiProperty({ type: String, isArray: true })
  @IsArray()
  @IsString({ each: true })
  tags: string[];
}
