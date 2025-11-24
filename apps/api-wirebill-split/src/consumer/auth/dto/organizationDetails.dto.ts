import { ApiProperty, PickType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsString, IsNotEmpty } from 'class-validator';

import { $Enums, type OrganizationDetailsModel } from '@remoola/database';

class OrganizationDetailsDTO implements OrganizationDetailsModel {
  @Expose()
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;

  @Expose()
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Expose()
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  consumerRole: null | $Enums.ConsumerRole;

  @Expose()
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  consumerRoleOther: null | string;

  @Expose()
  @ApiProperty({ enum: $Enums.OrganizationSize })
  @IsNotEmpty()
  size: $Enums.OrganizationSize;

  @Expose()
  @ApiProperty()
  consumerId: string;

  @Expose()
  @ApiProperty()
  createdAt: Date;

  @Expose()
  @ApiProperty()
  updatedAt: Date;

  @Expose()
  @ApiProperty()
  deletedAt: Date;
}

export class OrganizationDetailsUpsert extends PickType(OrganizationDetailsDTO, [
  `name`,
  `consumerRole`,
  `size`,
] as const) {}

export class OrganizationDetailsUpsertOkResponse {
  @Expose()
  @ApiProperty()
  organizationId: string;
}
