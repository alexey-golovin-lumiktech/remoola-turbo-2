import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'

import { ICreditCardCreate, ICreditCardResponse, ICreditCardUpdate } from '@wirebill/shared-common/dtos'
import { ICreditCardModel } from '@wirebill/shared-common/models'

import { BaseModel } from '../common'

class CreditCard extends BaseModel implements ICreditCardModel {
  @Expose()
  @ApiProperty({ required: true })
  consumerId: string

  @Expose()
  @ApiProperty({ required: true })
  brand: string

  @Expose()
  @ApiProperty({ required: true })
  country: string

  @Expose()
  @ApiProperty({ required: true })
  expMonth: number

  @Expose()
  @ApiProperty({ required: true })
  expYear: number

  @Expose()
  @ApiProperty({ required: true })
  last4: string
}

export class CreditCardResponse extends OmitType(CreditCard, [`deletedAt`] as const) implements ICreditCardResponse {}

export class CreditCardsListResponse {
  @Expose()
  @ApiProperty({ required: true })
  count: number

  @Expose()
  @ApiProperty({ required: true, type: [CreditCardResponse] })
  @Type(() => CreditCardResponse)
  data: CreditCardResponse[]
}

export class CreditCardCreate
  extends PickType(CreditCard, [`brand`, `country`, `expMonth`, `expYear`, `last4`] as const)
  implements ICreditCardCreate {}

export class CreditCardUpdate extends PartialType(CreditCardCreate) implements ICreditCardUpdate {}
