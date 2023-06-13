import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsString } from 'class-validator'
import { TokenPayload as ITokenPayload } from 'google-auth-library'

import { AccountType, accountTypeVariants, ContractorKind, contractorKindVariants } from '../../shared-types'

export type ITokenPayloadPick = Pick<
  ITokenPayload,
  | `email` //
  | `email_verified`
  | `name`
  | `given_name`
  | `family_name`
  | `picture`
>

export class GoogleProfile {
  emailVerified: boolean

  email?: string
  name?: string
  givenName?: string
  familyName?: string
  picture?: string
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
  @ApiProperty({ enum: accountTypeVariants })
  accountType: AccountType

  @Expose()
  @ApiProperty({ enum: contractorKindVariants, default: null, required: false })
  contractorKind?: ContractorKind = null
}
