import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

import { ConsumerContactAddress } from './consumer-contact.dto';

export class ConsumerDocument {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  name: string;

  @Expose()
  @ApiProperty()
  url: string;

  @Expose()
  @ApiProperty()
  createdAt: Date;
}

export class ConsumerPaymentRequest {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  amount: string;

  @Expose()
  @ApiProperty()
  status: string;

  @Expose()
  @ApiProperty()
  createdAt: Date;
}

export class ConsumerContactDetails {
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

  @Expose()
  @ApiProperty({ type: ConsumerPaymentRequest, isArray: true })
  paymentRequests: ConsumerPaymentRequest[];

  @Expose()
  @ApiProperty({ type: ConsumerDocument, isArray: true })
  documents: ConsumerDocument[];
}
