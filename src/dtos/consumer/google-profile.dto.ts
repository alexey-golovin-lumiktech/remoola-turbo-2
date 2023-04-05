import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsString } from 'class-validator'
import { TokenPayload as ITokenPayload } from 'google-auth-library'

export type ITokenPayloadPick = Pick<ITokenPayload, `email` | `email_verified` | `name` | `given_name` | `family_name` | `exp` | `picture`>

export class TokenPayload implements ITokenPayloadPick {
  @Expose()
  public email?: string

  @Expose()
  public emailVerified?: boolean

  @Expose()
  public name?: string

  @Expose()
  public givenName?: string

  @Expose()
  public familyName?: string

  @Expose()
  public exp: number

  @Expose()
  public picture: string

  constructor(payload: ITokenPayload) {
    this.email = payload.email
    this.emailVerified = payload.email_verified
    this.name = payload.name
    this.givenName = payload.given_name
    this.familyName = payload.family_name
    this.picture = payload.picture
  }
}

export class GoogleProfile extends TokenPayload {
  @Expose()
  userID: string

  constructor(userId: string, payload: ITokenPayload) {
    super(payload)
    this.userID = userId
  }
}

export interface IGoogleLogin {
  credential: string
}

export class GoogleLogin implements IGoogleLogin {
  @Expose()
  @ApiProperty()
  @IsString()
  credential: string
}
