import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';

import {
  type ConsumerGoogleSignupSessionResponse,
  type ConsumerHandoffTokenRequest as ConsumerHandoffTokenRequestContract,
  type ConsumerLoginResponse as ConsumerLoginResponseContract,
  type ConsumerOAuthCompleteResponse as ConsumerOAuthCompleteResponseContract,
  type ConsumerSignupResponse as ConsumerSignupResponseContract,
} from '@remoola/api-types';

import { ConsumerDTO } from './consumer.dto';
import { fromBase64 } from '../../shared-common';

export class LoginResponse implements ConsumerLoginResponseContract {
  @Expose()
  @ApiProperty({ description: `Cookie-backed auth session was established successfully`, example: true })
  ok: true;
}

export class HandoffTokenRequest implements ConsumerHandoffTokenRequestContract {
  @Expose()
  @ApiProperty({ description: `Single-use OAuth handoff token`, example: `handoff-token-string` })
  handoffToken: string;
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

export class SignupResponse implements ConsumerSignupResponseContract {
  @Expose()
  @Type(() => ConsumerResponse)
  @ApiProperty({ type: () => ConsumerResponse })
  consumer: ConsumerResponse;

  @Expose()
  @ApiPropertyOptional({
    description: `Path to navigate to after a Google signup completes and the cookie session is established`,
    example: `/dashboard`,
  })
  next?: string;
}

export class GoogleSignupSessionResponse implements ConsumerGoogleSignupSessionResponse {
  @Expose()
  @ApiProperty({ description: `Google account email captured during signup`, example: `new.user@example.com` })
  email: string;

  @Expose()
  @ApiPropertyOptional({ description: `Google profile given name`, example: `Alex`, nullable: true })
  givenName?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: `Google profile family name`, example: `Doe`, nullable: true })
  familyName?: string | null;

  @Expose()
  @ApiPropertyOptional({
    description: `Google profile avatar URL`,
    example: `https://example.com/avatar.png`,
    nullable: true,
  })
  picture?: string | null;

  @Expose()
  @ApiPropertyOptional({
    description: `Preferred account type inferred from the OAuth signup flow`,
    example: `CONTRACTOR`,
    nullable: true,
  })
  accountType?: string | null;

  @Expose()
  @ApiPropertyOptional({
    description: `Preferred contractor kind inferred from the OAuth signup flow`,
    example: `INDIVIDUAL`,
    nullable: true,
  })
  contractorKind?: string | null;

  @Expose()
  @ApiPropertyOptional({ description: `Post-signup navigation target`, example: `/dashboard`, nullable: true })
  nextPath?: string | null;

  @Expose()
  @ApiPropertyOptional({
    description: `Signup step to resume after OAuth handoff`,
    example: `/signup/start`,
    nullable: true,
  })
  signupEntryPath?: string | null;
}

export class OAuthCompleteResponse extends LoginResponse implements ConsumerOAuthCompleteResponseContract {
  @Expose()
  @ApiPropertyOptional({
    description: `Path to navigate to after the cookie session is established`,
    example: `/dashboard`,
  })
  next?: string;
}

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
