import { Logger } from '@nestjs/common'
import { GetTokenResponse } from 'google-auth-library/build/src/auth/oauth2client'
import { Auth, google } from 'googleapis'
import _ from 'lodash'

import { toBase64 } from '@-/common-utils'
import { CONSUMER } from '@-/dtos'
import { envs } from '@-/envs'

export class GoogleAuthService {
  private logger = new Logger(GoogleAuthService.name)
  private googleapisOauth2Client: Auth.OAuth2Client
  private origin = /* envs.GOOGLE_CLIENT_LOCAL_ORIGIN || */ `http://127.0.0.1:8888`
  private scope: string[]

  constructor() {
    if (envs.GOOGLE_CALENDAR_SCOPES?.length) {
      const opts = {
        clientId: envs.GOOGLE_CLIENT_ID,
        clientSecret: envs.GOOGLE_CLIENT_SECRET,
        redirectUri: `${this.origin}/consumer/auth/google-redirect-new-way`,
      } satisfies Auth.OAuth2ClientOptions
      this.googleapisOauth2Client = new google.auth.OAuth2(opts)
    } else console.log(`[envs.GOOGLE_CALENDAR_SCOPES] is not defined`, envs.GOOGLE_CALENDAR_SCOPES)
  }

  async googleOAuthNewWay(state: { href: string }) {
    const opts = {
      state: toBase64(state),
      access_type: `offline`,
      scope: envs.GOOGLE_CALENDAR_SCOPES,
      include_granted_scopes: true,
      redirect_uri: `${this.origin}/consumer/auth/google-redirect-new-way`,
    } satisfies Auth.GenerateAuthUrlOpts
    return { Location: this.googleapisOauth2Client.generateAuthUrl(opts) }
  }

  async googleOAuthNewWayRedirect(query: CONSUMER.RedirectCallbackQuery) {
    const queryCode = _.get(query, `code`, null)
    const response: GetTokenResponse = await this.googleapisOauth2Client.getToken(queryCode)
    const verified = await this.googleapisOauth2Client.verifyIdToken({ idToken: response.tokens.id_token })
    const rawGoogleProfile = new CONSUMER.CreateGoogleProfileDetails(verified.getPayload())
    return rawGoogleProfile
  }
}
