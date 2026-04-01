import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsIn, IsString, ValidateIf } from 'class-validator';
import { type TokenPayload as ITokenPayload } from 'google-auth-library';

import { $Enums } from '@remoola/database-2';

import {
  type IGoogleProfileDetailsCreate,
  type IGoogleProfileDetailsModel,
  type IGoogleProfileDetailsResponse,
  type IGoogleProfileDetailsUpdate,
} from '../../shared-common';
import { BaseModel } from '../common';

export type ITokenPayloadPick = Pick<
  ITokenPayload,
  | `email` //
  | `email_verified`
  | `name`
  | `given_name`
  | `family_name`
  | `picture`
>;

export class CreateGoogleProfileDetails implements IGoogleProfileDetailsCreate {
  @Expose()
  @ApiProperty({ description: `Full name from Google profile`, required: false })
  name?: string;

  @Expose()
  @ApiProperty({ description: `Google account email address` })
  email: string;

  @Expose()
  @ApiProperty({ description: `Profile picture URL from Google`, required: false })
  picture?: string;

  @Expose()
  @ApiProperty({ description: `Whether the Google email has been verified` })
  emailVerified: boolean;

  @Exclude()
  data: string;

  @Expose()
  @ApiProperty({ description: `Given name (first name) from Google profile`, required: false })
  givenName?: string;

  @Expose()
  @ApiProperty({ description: `Family name (last name) from Google profile`, required: false })
  familyName?: string;

  @Expose()
  @ApiProperty({ description: `Google Workspace organization domain`, required: false })
  organization?: string;

  constructor(payload: ITokenPayload) {
    this.emailVerified = Boolean(payload.email_verified);

    this.email = payload.email;
    this.name = payload.name;
    this.givenName = payload.given_name;
    this.familyName = payload.family_name;
    this.picture = payload.picture;
    this.organization = payload.hd;
  }
}

export class GoogleSignin {
  @Expose()
  @ApiProperty({ description: `Google ID token from Google Sign-In credential response` })
  @IsString()
  credential: string;

  @Expose()
  @ApiProperty({ description: `Account type to associate with Google sign-in`, required: false })
  @ValidateIf((_, value) => value != null)
  @IsIn(Object.values($Enums.AccountType))
  accountType?: $Enums.AccountType;

  @Expose()
  @ApiProperty({ description: `Contractor kind to associate with Google sign-in`, required: false })
  @ValidateIf((_, value) => value != null)
  @IsIn(Object.values($Enums.ContractorKind))
  contractorKind?: $Enums.ContractorKind;
}

class GoogleProfileDetails extends BaseModel implements IGoogleProfileDetailsModel {
  @Expose()
  @ApiProperty({ description: `Whether the Google email has been verified`, required: true })
  emailVerified: boolean;

  @Expose()
  @ApiProperty({ description: `Google account email address`, required: true })
  email: string;

  @Expose()
  @ApiProperty({ description: `Full name from Google profile`, required: false })
  name?: string;

  @Expose()
  @ApiProperty({ description: `Given name (first name) from Google profile`, required: false })
  givenName?: string;

  @Expose()
  @ApiProperty({ description: `Family name (last name) from Google profile`, required: false })
  familyName?: string;

  @Expose()
  @ApiProperty({ description: `Profile picture URL from Google`, required: false })
  picture?: string;

  @Expose()
  @ApiProperty({ description: `Google Workspace organization domain`, required: false })
  organization?: string;

  @Expose()
  @ApiProperty({ description: `Additional metadata stored as JSON string`, required: false })
  metadata?: string;
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

export class GoogleProfileDetailsUpdate
  extends PartialType(GoogleProfileDetailsCreate)
  implements IGoogleProfileDetailsUpdate {}
