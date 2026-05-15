import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

import {
  type IGoogleProfileDetailsCreate,
  type IGoogleProfileDetailsModel,
  type IGoogleProfileDetailsResponse,
  type IGoogleProfileDetailsUpdate,
} from '../../shared-common';
import { BaseModel } from '../common';

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
