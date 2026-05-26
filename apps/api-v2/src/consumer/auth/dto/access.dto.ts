import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

import {
  type ConsumerGoogleSignupSessionResponse,
  type ConsumerHandoffTokenRequest as ConsumerHandoffTokenRequestContract,
  type ConsumerLoginResponse as ConsumerLoginResponseContract,
  type ConsumerOAuthCompleteResponse as ConsumerOAuthCompleteResponseContract,
  type ConsumerSignupResponse as ConsumerSignupResponseContract,
} from '@remoola/api-types';

export class LoginResponse implements ConsumerLoginResponseContract {
  @Expose()
  @ApiProperty({ description: `Cookie-backed auth session was established successfully`, example: true })
  ok: true;
}

export class HandoffTokenRequest implements ConsumerHandoffTokenRequestContract {
  @Expose()
  @ApiProperty({ description: `Single-use OAuth handoff token`, example: `handoff-token-string` })
  @Transform(({ obj }) => obj?.handoffToken)
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  handoffToken: string;
}

export class SignupResponseConsumer {
  declare private readonly contract: ConsumerSignupResponseContract[`consumer`];

  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty({ example: `email@email.com` })
  email: string;

  @Expose()
  @ApiProperty({ default: false })
  verified: boolean;

  @Expose()
  @ApiProperty({ nullable: true })
  accountType: ConsumerSignupResponseContract[`consumer`][`accountType`] | null;

  @Expose()
  @ApiProperty({ nullable: true })
  contractorKind: ConsumerSignupResponseContract[`consumer`][`contractorKind`] | null;

  @Expose()
  @ApiProperty({ nullable: true })
  howDidHearAboutUs: ConsumerSignupResponseContract[`consumer`][`howDidHearAboutUs`] | null;
}

export class SignupResponse implements ConsumerSignupResponseContract {
  @Expose()
  @Type(() => SignupResponseConsumer)
  @ApiProperty({ type: () => SignupResponseConsumer })
  consumer: SignupResponseConsumer;

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
