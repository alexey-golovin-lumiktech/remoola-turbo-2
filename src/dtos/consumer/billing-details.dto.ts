import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsEmail } from 'class-validator'

import * as constants from '../../constants'

import { IBaseModel, IBillingDetailsModel } from 'src/models'

export type IUpsertBillingDetails = Partial<Omit<IBillingDetailsModel, keyof IBaseModel>> & { consumerId: string }

export type IBillingDetailsResponse = Pick<
  IBillingDetailsModel,
  | `id` //
  | `email`
  | `name`
  | `phone`
  | `city`
  | `country`
  | `line1`
  | `line2`
  | `postalCode`
  | `state`
>

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
