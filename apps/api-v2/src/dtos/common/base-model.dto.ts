import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsDate, IsString, ValidateIf } from 'class-validator';
import moment from 'moment';

import { type IBaseModel } from '../../shared-common';

export class BaseModel implements IBaseModel {
  @Expose()
  @ApiProperty({ description: `Unique identifier of the entity (UUID v4)` })
  @IsString()
  id: string;

  @Expose()
  @ApiProperty({ description: `Timestamp of entity creation (Unix milliseconds)` })
  @Transform((x) => (x?.value == null ? null : moment(x.value).valueOf()))
  @IsDate()
  createdAt: Date;

  @Expose()
  @ApiProperty({ description: `Timestamp of last entity update (Unix milliseconds)` })
  @Transform((x) => (x?.value == null ? null : moment(x.value).valueOf()))
  @IsDate()
  updatedAt: Date;

  @Expose()
  @ApiProperty({ description: `Timestamp of soft deletion (Unix milliseconds), null if not deleted`, required: false })
  @Transform((x) => (x?.value == null ? null : moment(x.value).valueOf()))
  @ValidateIf((x) => x.value != null)
  @IsDate()
  deletedAt: Date;
}
