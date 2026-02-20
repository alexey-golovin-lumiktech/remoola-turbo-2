import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ConsumerContactAddress {
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

export class ConsumerContact {
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

export class ConsumerCreateContact {
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

export class ConsumerUpdateContact {
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

export class ConsumerContactsResponse {
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
