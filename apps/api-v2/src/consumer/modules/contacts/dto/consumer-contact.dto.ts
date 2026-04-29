import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { IsEmail, IsOptional, IsString, ValidateNested } from 'class-validator';

import {
  type ConsumerContactsResponse as ConsumerContactsResponseContract,
  type ConsumerContactResponse as ConsumerContactResponseContract,
  type ConsumerContactSearchItem as ConsumerContactSearchItemContract,
  type ConsumerCreateContactPayload,
  ConsumerUpdateContactPayload,
} from '@remoola/api-types';

const preserveRawField = (field: string) => Transform(({ obj }) => obj?.[field]);

export class ConsumerContactAddress implements NonNullable<ConsumerContactResponseContract[`address`]> {
  @Expose()
  @ApiProperty()
  @preserveRawField(`postalCode`)
  @IsOptional()
  @IsString()
  postalCode: string;

  @Expose()
  @ApiProperty()
  @preserveRawField(`country`)
  @IsOptional()
  @IsString()
  country: string;

  @Expose()
  @ApiProperty()
  @preserveRawField(`state`)
  @IsOptional()
  @IsString()
  state: string;

  @Expose()
  @ApiProperty()
  @preserveRawField(`city`)
  @IsOptional()
  @IsString()
  city: string;

  @Expose()
  @ApiProperty()
  @preserveRawField(`street`)
  @IsOptional()
  @IsString()
  street: string;
}

export class ConsumerContact implements ConsumerContactResponseContract {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  email: string;

  @Expose()
  @ApiProperty()
  name: string | null;

  @Expose()
  @ApiProperty({ type: ConsumerContactAddress })
  address: ConsumerContactAddress;
}

export class ConsumerCreateContact implements ConsumerCreateContactPayload {
  @Expose()
  @ApiProperty()
  @preserveRawField(`email`)
  @IsEmail()
  email: string;

  @Expose()
  @ApiProperty({ required: false })
  @preserveRawField(`name`)
  @IsOptional()
  @IsString()
  name?: string;

  @Expose()
  @ApiProperty({ required: false, type: ConsumerContactAddress })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConsumerContactAddress)
  address?: ConsumerContactAddress;
}

export class ConsumerUpdateContact implements ConsumerUpdateContactPayload {
  @Expose()
  @ApiProperty({ required: false })
  @preserveRawField(`email`)
  @IsOptional()
  @IsEmail()
  email?: string;

  @Expose()
  @ApiProperty({ required: false })
  @preserveRawField(`name`)
  @IsOptional()
  @IsString()
  name?: string;

  @Expose()
  @ApiProperty({ required: false, type: ConsumerContactAddress })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConsumerContactAddress)
  address?: ConsumerContactAddress;
}

export class ConsumerContactSearchItem implements ConsumerContactSearchItemContract {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  name: string | null;

  @Expose()
  @ApiProperty()
  email: string;
}

export class ConsumerContactsResponse implements ConsumerContactsResponseContract {
  @Expose()
  @ApiProperty({ type: [ConsumerContact] })
  items: ConsumerContact[];

  @Expose()
  @ApiProperty()
  total: number;

  @Expose()
  @ApiProperty()
  page: number;

  @Expose()
  @ApiProperty()
  pageSize: number;
}
