import { ApiProperty, OmitType, PickType } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';

import { ConsumerModel } from './consumer.dto';
import { fromBase64 } from '../../shared-common';

export class LoginResponse extends OmitType(ConsumerModel, [`password`, `salt`] as const) {
  @Expose()
  @ApiProperty({ example: `access-token-string` })
  accessToken: string;

  @Expose()
  @ApiProperty({ example: `access-token-string` })
  refreshToken: string;
}

export class SignupRequest extends PickType(ConsumerModel, [
  `email`, //
  `firstName`,
  `lastName`,
  `password`,
  `accountType`,
  `contractorKind`,
] as const) {}

export class ConsumerResponse extends PickType(ConsumerModel, [
  `id`,
  `email`,
  `firstName`,
  `lastName`,
  `verified`,
  `accountType`,
  `contractorKind`,
  `howDidHearAboutUs`,
] as const) {}

export class GoogleOAuthNewWayResponse {
  @Expose()
  @ApiProperty({ example: `Redirect-Location-string` })
  Location: string;
}

export class GoogleOAuth2Query {
  @Expose()
  @ApiProperty()
  href: string;
}

export class OAuthState {
  @Expose()
  @ApiProperty()
  href: string;
}

export class RedirectCallbackQuery {
  @Expose()
  @ApiProperty()
  code: string;

  @Expose()
  @ApiProperty()
  @Transform(({ value }) => {
    return typeof value == `string` ? value.replace(/\s+/gi, ` `).split(` `) : [value];
  })
  scope: string[];

  @Expose()
  @ApiProperty()
  @Transform(({ value }) => fromBase64<OAuthState>(value))
  state?: OAuthState;

  @Expose()
  @ApiProperty()
  error?: `access_denied` | string = null;
}
