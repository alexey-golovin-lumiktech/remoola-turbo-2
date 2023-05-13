import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsEmail } from 'class-validator'

import * as constants from '../../constants'

import { IAddressModel, IBaseModel, IBillingDetailsModel } from 'src/models'

export type IUpsertBillingDetails = Partial<Omit<IBillingDetailsModel, keyof IBaseModel>> & { consumerId: string }

export type IAddressModelPick = Pick<IAddressModel, `id` | `city` | `country` | `line1` | `line2` | `postalCode` | `state`>
export type IBillingDetailsModelPick = Pick<IBillingDetailsModel, `id` | `email` | `name` | `phone`>
export type IBillingDetailsResponse = IBillingDetailsModelPick & { address: IAddressModelPick }

export class BillingDetailsAddress implements IAddressModelPick {
  @Expose()
  @ApiProperty()
  id: string

  @Expose()
  @ApiPropertyOptional({ default: null })
  city?: string

  @Expose()
  @ApiPropertyOptional({ default: null })
  country?: string

  @Expose()
  @ApiPropertyOptional({ default: null })
  line1?: string

  @Expose()
  @ApiPropertyOptional({ default: null })
  line2?: string

  @Expose()
  @ApiPropertyOptional({ default: null })
  postalCode?: string

  @Expose()
  @ApiPropertyOptional({ default: null })
  state?: string
}

export class BillingDetailsResponse implements IBillingDetailsResponse {
  @Expose()
  @ApiProperty()
  id: string

  @Expose()
  @IsEmail({}, { message: constants.constants.INVALID_EMAIL })
  @ApiPropertyOptional({ default: null })
  email?: string

  @Expose()
  @ApiPropertyOptional({ default: null })
  name?: string

  @Expose()
  @ApiPropertyOptional({ default: null })
  phone?: string

  @Expose()
  @ApiProperty({ default: null, type: BillingDetailsAddress })
  address: BillingDetailsAddress = null
}
