import { ApiProperty, OmitType, PickType } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';

import { ConsumerDTO } from './consumer.dto';
import { fromBase64 } from '../../shared-common';

export class LoginResponse extends OmitType(ConsumerDTO, [`password`, `salt`] as const) {
  @Expose()
  @ApiProperty({ description: `JWT access token for authenticated API requests`, example: `access-token-string` })
  accessToken: string;

  @Expose()
  @ApiProperty({ description: `JWT refresh token for obtaining new access tokens`, example: `access-token-string` })
  refreshToken: string;
}

export class SignupRequest extends PickType(ConsumerDTO, [
  `email`, //
  `password`,
  `accountType`,
  `contractorKind`,
] as const) {}

export class ConsumerResponse extends PickType(ConsumerDTO, [
  `id`,
  `email`,
  `verified`,
  `accountType`,
  `contractorKind`,
  `howDidHearAboutUs`,
] as const) {}

export class GoogleOAuthNewWayResponse {
  @Expose()
  @ApiProperty({ description: `Redirect URL for Google OAuth flow completion`, example: `Redirect-Location-string` })
  Location: string;
}

export class GoogleOAuth2Query {
  @Expose()
  @ApiProperty({ description: `OAuth authorization URL href` })
  href: string;
}

export class OAuthState {
  @Expose()
  @ApiProperty({ description: `State parameter for OAuth CSRF protection` })
  href: string;
}

export class RedirectCallbackQuery {
  @Expose()
  @ApiProperty({ description: `Authorization code from OAuth provider` })
  code: string;

  @Expose()
  @ApiProperty({ description: `OAuth scopes granted by the user` })
  @Transform(({ value }) => {
    return typeof value == `string` ? value.replace(/\s+/gi, ` `).split(` `) : [value];
  })
  scope: string[];

  @Expose()
  @ApiProperty({ description: `State object for OAuth callback validation`, required: false })
  @Transform(({ value }) => fromBase64<OAuthState>(value))
  state?: OAuthState;

  @Expose()
  @ApiProperty({ description: `OAuth error code if authorization failed`, required: false })
  error?: `access_denied` | string = null;
}
