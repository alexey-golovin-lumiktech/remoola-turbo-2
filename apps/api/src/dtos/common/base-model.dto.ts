import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsDate, IsString, ValidateIf } from 'class-validator';
import moment from 'moment';

import { type IBaseModel } from '../../shared-common';

export class BaseModel implements IBaseModel {
  @Expose()
  @ApiProperty()
  @IsString()
  id: string;

  @Expose()
  @ApiProperty()
  @Transform((x) => (x?.value == null ? null : moment(x.value).valueOf()))
  @IsDate()
  createdAt: Date;

  @Expose()
  @ApiProperty()
  @Transform((x) => (x?.value == null ? null : moment(x.value).valueOf()))
  @IsDate()
  updatedAt: Date;

  @Expose()
  @ApiProperty()
  @Transform((x) => (x?.value == null ? null : moment(x.value).valueOf()))
  @ValidateIf((x) => x.value != null)
  @IsDate()
  deletedAt: Date;
}
