import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsIn, IsUUID } from 'class-validator';

import { $Enums } from '@remoola/database-2';

import {
  type CreditCardExpMonth,
  type CreditCardExpYear,
  type IPaymentMethodModel,
  type IPaymentMethodResponse,
} from '../../shared-common';
import { BaseModel } from '../common';

export class PaymentMethod extends BaseModel implements IPaymentMethodModel {
  @Expose()
  @IsUUID(`all`)
  @ApiProperty()
  consumerId: string;

  @Expose()
  @ApiProperty({ required: true })
  @IsIn(Object.values($Enums.PaymentMethodType))
  type: $Enums.PaymentMethodType;

  @Expose()
  @ApiProperty({ required: true })
  brand: string;

  @Expose()
  @ApiProperty({ required: true })
  last4: string;

  @Expose()
  @ApiProperty({ required: false })
  defaultSelected: boolean = false;

  @Expose()
  @ApiProperty({ required: false, default: null })
  serviceFee?: number = null;

  @Expose()
  @ApiProperty({ required: false, default: null })
  expMonth?: CreditCardExpMonth = null;

  @Expose()
  @ApiProperty({ required: false, default: null })
  expYear?: CreditCardExpYear = null;
}

export class PaymentMethodResponse
  extends OmitType(PaymentMethod, [`deletedAt`] as const)
  implements IPaymentMethodResponse {}

export class PaymentMethodListResponse {
  @Expose()
  @ApiProperty({ required: true })
  count: number;

  @Expose()
  @ApiProperty({ required: true, type: [PaymentMethodResponse] })
  @Type(() => PaymentMethodResponse)
  data: PaymentMethodResponse[];
}

export class PaymentMethodCreate extends PickType(PaymentMethod, [
  `type`,
  `brand`,
  `last4`,
  `expMonth`,
  `expYear`,
] as const) {}
export class PaymentMethodUpdate extends PartialType(
  PickType(PaymentMethod, [`brand`, `last4`, `expMonth`, `expYear`] as const),
) {}
