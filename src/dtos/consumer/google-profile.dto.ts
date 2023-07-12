import { ApiProperty, OmitType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsIn, IsString, ValidateIf } from 'class-validator'
import { TokenPayload as ITokenPayload } from 'google-auth-library'

import { IGoogleProfileDetailsModel } from '@wirebill/shared-common'
import { IGoogleProfileDetailsCreate } from '@wirebill/shared-common/dtos'
import { AccountType, ContractorKind } from '@wirebill/shared-common/enums'
import { AccountTypeValue, ContractorKindValue } from '@wirebill/shared-common/types'

export type ITokenPayloadPick = Pick<
  ITokenPayload,
  | `email` //
  | `email_verified`
  | `name`
  | `given_name`
  | `family_name`
  | `picture`
>

export class CreateGoogleProfileDetails implements IGoogleProfileDetailsCreate {
  name?: string
  email: string
  picture?: string
  emailVerified: boolean
  data: string
  givenName?: string
  familyName?: string
  organization?: string

  constructor(payload: ITokenPayload) {
    this.emailVerified = Boolean(payload.email_verified)

    this.email = payload.email
    this.name = payload.name
    this.givenName = payload.given_name
    this.familyName = payload.family_name
    this.picture = payload.picture
    this.organization = payload.hd
  }
}

export class GoogleSignin {
  @Expose()
  @ApiProperty()
  @IsString()
  credential: string

  @Expose()
  @ApiProperty({ required: false })
  @ValidateIf((_, value) => value != null)
  @IsIn(Object.values(AccountType))
  accountType?: AccountTypeValue

  @Expose()
  @ApiProperty({ required: false })
  @ValidateIf((_, value) => value != null)
  @IsIn(Object.values(ContractorKind))
  contractorKind?: ContractorKindValue
}

class GoogleProfileDetails implements IGoogleProfileDetailsModel {
  consumerId: string
  emailVerified: boolean
  data: string
  email: string
  name?: string
  givenName?: string
  familyName?: string
  picture?: string
  organization?: string
  id: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

export class GoogleProfileDetailsResponse extends OmitType(GoogleProfileDetails, [`deletedAt`] as const) {}
