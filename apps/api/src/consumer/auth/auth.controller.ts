import { type IncomingHttpHeaders } from 'http';

import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Res,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiBody, ApiTags, ApiBasicAuth, ApiBearerAuth } from '@nestjs/swagger';
import express from 'express';
import _ from 'lodash';

import { type ConsumerModel } from '@remoola/database-2';

import { ConsumerAuthService } from './auth.service';
import { ConsumerSignupGPT, GoogleOAuthGPT } from './dto';
import { GoogleAuthService } from './google-auth.service';
import { GoogleOAuthServiceGPT } from './google-oauth.service';
import { Identity, PublicEndpoint } from '../../common';
import { CONSUMER } from '../../dtos';
import { envs, JWT_ACCESS_TTL, JWT_REFRESH_TTL } from '../../envs';
import { TransformResponse } from '../../interceptors';
import { ACCESS_TOKEN_COOKIE_KEY, REFRESH_TOKEN_COOKIE_KEY, removeNil } from '../../shared-common';

@ApiTags(`Consumer: Auth`)
@ApiBearerAuth(`bearer`) // 👈 tells Swagger to attach Bearer token
@ApiBasicAuth(`basic`) // 👈 optional, if this route also accepts Basic Auth
@Controller(`auth`)
export class ConsumerAuthController {
  private readonly logger = new Logger(ConsumerAuthController.name);

  constructor(
    private readonly service: ConsumerAuthService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly googleOAuthServiceGPT: GoogleOAuthServiceGPT,
  ) {}

  private setAuthCookies(res: express.Response, accessToken: string, refreshToken: string) {
    const isProd = envs.NODE_ENV == `production`;

    if (envs.VERCEL !== 0) {
      const vercelCookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: `none`,
        path: `/`,
        domain: `.vercel.app`,
        maxAge: 900000, // 15 min
      } as const;
      console.log(`VERCEL COOKIE`, vercelCookieOptions);
      res.cookie(ACCESS_TOKEN_COOKIE_KEY, accessToken, { ...vercelCookieOptions, maxAge: JWT_ACCESS_TTL });
      res.cookie(REFRESH_TOKEN_COOKIE_KEY, refreshToken, { ...vercelCookieOptions, maxAge: JWT_REFRESH_TTL });
    } else {
      const sameSite = isProd ? (`none` as const) : (`lax` as const);
      const secure = isProd || process.env.COOKIE_SECURE == `true`;

      const common = {
        httpOnly: true,
        sameSite,
        secure,
        path: `/`,
      };

      console.log(`NO VERCEL COOKIE`, common);
      res.cookie(ACCESS_TOKEN_COOKIE_KEY, accessToken, { ...common, maxAge: JWT_ACCESS_TTL });
      res.cookie(REFRESH_TOKEN_COOKIE_KEY, refreshToken, { ...common, maxAge: JWT_REFRESH_TTL });
    }
  }

  @Post(`login`)
  @PublicEndpoint()
  @ApiOperation({ operationId: `consumer_auth_login` })
  @ApiOkResponse({ type: CONSUMER.LoginResponse })
  @TransformResponse(CONSUMER.LoginResponse)
  async login(@Res({ passthrough: true }) res, @Body() body: any) {
    const data = await this.service.login(body);
    this.setAuthCookies(res, data.accessToken, data.refreshToken);
    return data;
  }

  @PublicEndpoint()
  @Get(`google-new-way`)
  @ApiOkResponse({ type: CONSUMER.GoogleOAuthNewWayResponse })
  @TransformResponse(CONSUMER.GoogleOAuthNewWayResponse)
  googleOAuthNewWay(@Query() query: CONSUMER.GoogleOAuth2Query) {
    return this.googleAuthService.googleOAuthNewWay(query);
  }

  @PublicEndpoint()
  @Get(`google-redirect-new-way`)
  @ApiOkResponse({ type: CONSUMER.LoginResponse })
  @TransformResponse(CONSUMER.LoginResponse)
  async googleOAuthNewWayRedirect(@Res() response: express.Response, @Query() query: CONSUMER.RedirectCallbackQuery) {
    const queryStateHref = _.get(query, `state.href`, null);
    if (queryStateHref == null) {
      this.logger.debug({ caller: this.googleOAuthNewWayRedirect.name, payload: { queryStateHref, query } });
      return;
    }
    if (query?.error == null) await this.googleAuthService.googleOAuthNewWayRedirect(query);
    const url = new URL(queryStateHref);
    return response.status(301).redirect(url.origin + `/create-profile`);
  }

  @PublicEndpoint()
  @Post(`google-oauth`)
  @ApiOkResponse({ type: CONSUMER.LoginResponse })
  @TransformResponse(CONSUMER.LoginResponse)
  googleOAuth(@Body() body: CONSUMER.GoogleSignin) {
    return this.service.googleOAuth(removeNil(body));
  }

  @PublicEndpoint()
  @Post(`google-login-gpt`)
  @HttpCode(HttpStatus.OK)
  async googleLoginGPT(@Body() body: GoogleOAuthGPT) {
    // You can set cookies here if you integrate with AuthService
    const result = await this.googleOAuthServiceGPT.googleLoginGPT(removeNil(body));
    return result;
  }

  @PublicEndpoint()
  @Post(`refresh-access`)
  @ApiOperation({ operationId: `refresh_access` })
  @ApiBody({ schema: { type: `object`, properties: { refreshToken: { type: `string` } } } })
  @ApiOkResponse({ type: CONSUMER.LoginResponse })
  refreshAccess(@Body(`refreshToken`) refreshToken: string) {
    return this.service.refreshAccess(refreshToken);
  }

  @PublicEndpoint()
  @Post(`change-password`)
  checkEmailAndSendRecoveryLink(@Headers() headers: IncomingHttpHeaders, @Body() body: { email: string }) {
    const referer = headers.origin || headers.referer;
    if (!referer) throw new InternalServerErrorException(`Unexpected referer(origin): ${referer}`);
    return this.service.checkEmailAndSendRecoveryLink(removeNil(body), referer);
  }

  @PublicEndpoint()
  @Patch(`change-password/:token`)
  changePassword(@Param() param: CONSUMER.ChangePasswordParam, @Body() body: CONSUMER.ChangePasswordBody) {
    return this.service.changePassword(removeNil(body), removeNil(param));
  }

  @Get(`me`)
  me(@Identity() identity: ConsumerModel) {
    return identity;
  }

  @PublicEndpoint()
  @Post(`signup`)
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() body: ConsumerSignupGPT) {
    const consumer = await this.service.signup(removeNil(body));
    return { consumer };
  }

  @PublicEndpoint()
  @Get(`signup/:consumerId/complete-profile-creation`)
  completeProfileCreation(@Req() req: express.Request, @Param(`consumerId`) consumerId: string) {
    const referer = req.headers.origin || req.headers.referer;
    if (!referer) throw new InternalServerErrorException(`Unexpected referer(origin): ${referer}`);
    this.service.completeProfileCreationAndSendVerificationEmail(consumerId, referer);
    return `success`;
  }

  @PublicEndpoint()
  @Get(`signup/verification`)
  signupVerification(@Query(`referer`) referer: string, @Query(`token`) token: string, @Res() res: express.Response) {
    if (!referer) throw new InternalServerErrorException(`Unexpected referer(origin): ${referer}`);
    return this.service.signupVerification(token, res, referer);
  }
}
