import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class LatestTransaction {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  status: string;

  @Expose()
  @ApiProperty()
  createdAt: string;
}

export class Counterparty {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  email: string;
}

export class PaymentListItemDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  amount: number;

  @Expose()
  @ApiProperty()
  currencyCode: string;

  @Expose()
  @ApiProperty()
  status: string;

  @Expose()
  @ApiProperty()
  type: string;

  @Expose()
  @ApiProperty()
  description: string | null;

  @Expose()
  @ApiProperty()
  createdAt: string;

  @Expose()
  @ApiProperty({ type: Counterparty, isArray: false })
  counterparty: Counterparty;

  @Expose()
  @ApiProperty({ type: LatestTransaction, isArray: false, required: false })
  latestTransaction?: LatestTransaction;
}

export class PaymentsListDto {
  @Expose()
  @ApiProperty({ type: PaymentListItemDto, isArray: true })
  items: PaymentListItemDto[];

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
