import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'
import { Exclude, Expose } from 'class-transformer'
import { IsIn, IsString, ValidateIf } from 'class-validator'
import { TokenPayload as ITokenPayload } from 'google-auth-library'

import { IGoogleProfileDetailsCreate, IGoogleProfileDetailsResponse, IGoogleProfileDetailsUpdate } from '@wirebill/shared-common/dtos'
import { AccountType, ContractorKind } from '@wirebill/shared-common/enums'
import { IGoogleProfileDetailsModel } from '@wirebill/shared-common/models'
import { AccountTypeValue, ContractorKindValue } from '@wirebill/shared-common/types'

import { BaseModel } from '../common'

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
  @Expose()
  @ApiProperty({ required: false })
  name?: string

  @Expose()
  @ApiProperty()
  email: string

  @Expose()
  @ApiProperty({ required: false })
  picture?: string

  @Expose()
  @ApiProperty()
  emailVerified: boolean

  @Exclude()
  data: string

  @Expose()
  @ApiProperty({ required: false })
  givenName?: string

  @Expose()
  @ApiProperty({ required: false })
  familyName?: string

  @Expose()
  @ApiProperty({ required: false })
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

class GoogleProfileDetails extends BaseModel implements IGoogleProfileDetailsModel {
  @Expose()
  @ApiProperty({ required: true })
  consumerId: string

  @Expose()
  @ApiProperty({ required: true })
  emailVerified: boolean

  @Expose()
  @ApiProperty({ required: true })
  email: string

  @Expose()
  @ApiProperty({ required: false })
  name?: string

  @Expose()
  @ApiProperty({ required: false })
  givenName?: string

  @Expose()
  @ApiProperty({ required: false })
  familyName?: string

  @Expose()
  @ApiProperty({ required: false })
  picture?: string

  @Expose()
  @ApiProperty({ required: false })
  organization?: string

  @Expose()
  @ApiProperty({ required: false })
  metadata?: string
}

export class GoogleProfileDetailsResponse
  extends OmitType(GoogleProfileDetails, [`deletedAt`] as const)
  implements IGoogleProfileDetailsResponse {}

export class GoogleProfileDetailsCreate
  extends PickType(GoogleProfileDetails, [
    `name`, //
    `emailVerified`,
    `email`,
    `givenName`,
    `familyName`,
    `picture`,
    `organization`,
  ] as const)
  implements IGoogleProfileDetailsCreate {}

export class GoogleProfileDetailsUpdate extends PartialType(GoogleProfileDetailsCreate) implements IGoogleProfileDetailsUpdate {}
