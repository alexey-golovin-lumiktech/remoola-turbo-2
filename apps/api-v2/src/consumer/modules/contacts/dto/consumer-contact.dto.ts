import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

import {
  type ConsumerContactsResponse as ConsumerContactsResponseContract,
  type ConsumerContactResponse as ConsumerContactResponseContract,
  type ConsumerContactSearchItem as ConsumerContactSearchItemContract,
  type ConsumerCreateContactPayload,
  ConsumerUpdateContactPayload,
} from '@remoola/api-types';

export class ConsumerContactAddress implements NonNullable<ConsumerContactResponseContract[`address`]> {
  @Expose()
  @ApiProperty()
  postalCode: string;

  @Expose()
  @ApiProperty()
  country: string;

  @Expose()
  @ApiProperty()
  state: string;

  @Expose()
  @ApiProperty()
  city: string;

  @Expose()
  @ApiProperty()
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
  email: string;

  @Expose()
  @ApiProperty({ required: false })
  name?: string;

  @Expose()
  @ApiProperty({ required: false, type: ConsumerContactAddress })
  address?: ConsumerContactAddress;
}

export class ConsumerUpdateContact implements ConsumerUpdateContactPayload {
  @Expose()
  @ApiProperty({ required: false })
  email?: string;

  @Expose()
  @ApiProperty({ required: false })
  name?: string;

  @Expose()
  @ApiProperty({ required: false, type: ConsumerContactAddress })
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
