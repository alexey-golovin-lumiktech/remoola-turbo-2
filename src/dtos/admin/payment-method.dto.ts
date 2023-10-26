import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'
import { IsIn, IsUUID } from 'class-validator'

import { IPaymentMethodResponse } from '@wirebill/shared-common/dtos'
import { PaymentMethodType } from '@wirebill/shared-common/enums'
import { IPaymentMethodModel } from '@wirebill/shared-common/models'
import { CreditCardExpMonth, CreditCardExpYear, PaymentMethodTypeValue } from '@wirebill/shared-common/types'

import { BaseModel } from '../common'

export class PaymentMethod extends BaseModel implements IPaymentMethodModel {
  @Expose()
  @IsUUID(`all`)
  @ApiProperty()
  consumerId: string

  @Expose()
  @ApiProperty({ required: true })
  @IsIn(Object.values(PaymentMethodType))
  type: PaymentMethodTypeValue

  @Expose()
  @ApiProperty({ required: true })
  brand: string

  @Expose()
  @ApiProperty({ required: true })
  last4: string

  @Expose()
  @ApiProperty({ required: false })
  defaultSelected: boolean = false

  @Expose()
  @ApiProperty({ required: false, default: null })
  serviceFee?: number = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  expMonth?: CreditCardExpMonth = null

  @Expose()
  @ApiProperty({ required: false, default: null })
  expYear?: CreditCardExpYear = null
}

export class PaymentMethodResponse extends OmitType(PaymentMethod, [`deletedAt`] as const) implements IPaymentMethodResponse {}

export class PaymentMethodListResponse {
  @Expose()
  @ApiProperty({ required: true })
  count: number

  @Expose()
  @ApiProperty({ required: true, type: [PaymentMethodResponse] })
  @Type(() => PaymentMethodResponse)
  data: PaymentMethodResponse[]
}

export class PaymentMethodCreate extends PickType(PaymentMethod, [`type`, `brand`, `last4`, `expMonth`, `expYear`] as const) {}
export class PaymentMethodUpdate extends PartialType(PickType(PaymentMethod, [`brand`, `last4`, `expMonth`, `expYear`] as const)) {}
