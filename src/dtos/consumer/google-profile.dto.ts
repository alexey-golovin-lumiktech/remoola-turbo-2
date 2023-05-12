import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsString } from 'class-validator'
import { TokenPayload as ITokenPayload } from 'google-auth-library'

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

  email: string | null
  name: string | null
  givenName: string | null
  familyName: string | null
  picture: string | null
  organization: string | null

  constructor(payload: ITokenPayload) {
    this.emailVerified = Boolean(payload.email_verified)

    this.email = payload.email ?? null
    this.name = payload.name ?? null
    this.givenName = payload.given_name ?? null
    this.familyName = payload.family_name ?? null
    this.picture = payload.picture ?? null
    this.organization = payload.hd ?? null
  }
}
export interface IGoogleSignin {
  credential: string
}

export class GoogleSignin implements IGoogleSignin {
  @Expose()
  @ApiProperty()
  @IsString()
  credential: string
}
