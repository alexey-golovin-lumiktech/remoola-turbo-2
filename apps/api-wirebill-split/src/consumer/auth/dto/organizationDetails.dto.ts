import { ApiProperty, PickType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsString, IsNotEmpty } from 'class-validator';

import { $Enums, type OrganizationDetails as IOrganizationDetails } from '@remoola/database';

class OrganizationDetails implements IOrganizationDetails {
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
  consumerRole: string;

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

export class OrganizationDetailsUpsert extends PickType(OrganizationDetails, [
  `name`,
  `consumerRole`,
  `size`,
] as const) {}

export class OrganizationDetailsUpsertOkResponse {
  @Expose()
  @ApiProperty()
  organizationId: string;
}
