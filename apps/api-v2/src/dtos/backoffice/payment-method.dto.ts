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
  @ApiProperty({ description: `ID of the consumer who owns this payment method` })
  consumerId: string;

  @Expose()
  @ApiProperty({ description: `Payment method type (e.g., CREDIT_CARD, DEBIT_CARD, BANK_ACCOUNT)`, required: true })
  @IsIn(Object.values($Enums.PaymentMethodType))
  type: $Enums.PaymentMethodType;

  @Expose()
  @ApiProperty({ description: `Card brand (e.g., VISA, MASTERCARD, AMEX) or bank name`, required: true })
  brand: string;

  @Expose()
  @ApiProperty({ description: `Last 4 digits of the card number or account number`, required: true })
  last4: string;

  @Expose()
  @ApiProperty({ description: `Whether this payment method is the default for transactions`, required: false })
  defaultSelected: boolean = false;

  @Expose()
  @ApiProperty({
    description: `Service fee amount associated with this payment method`,
    required: false,
    default: null,
  })
  serviceFee?: number = null;

  @Expose()
  @ApiProperty({ description: `Credit card expiration month (1-12)`, required: false, default: null })
  expMonth?: CreditCardExpMonth = null;

  @Expose()
  @ApiProperty({ description: `Credit card expiration year (4-digit)`, required: false, default: null })
  expYear?: CreditCardExpYear = null;
}

export class PaymentMethodResponse
  extends OmitType(PaymentMethod, [`deletedAt`] as const)
  implements IPaymentMethodResponse {}

export class PaymentMethodListResponse {
  @Expose()
  @ApiProperty({ description: `Total number of payment methods in the result set`, required: true })
  count: number;

  @Expose()
  @ApiProperty({ description: `Array of payment method records`, required: true, type: [PaymentMethodResponse] })
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
