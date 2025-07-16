import { InternalServerErrorException } from '@nestjs/common'
import { GetTokenResponse } from 'google-auth-library/build/src/auth/oauth2client'
import { Auth, google } from 'googleapis'
import _ from 'lodash'

import { toBase64 } from '../../common-utils'
import { CONSUMER } from '../../dtos'
import { check, envs } from '../../envs'

export class GoogleAuthService {
  private googleapisOauth2Client: Auth.OAuth2Client
  private origin = `http://${envs.NEST_APP_HOST}:${envs.NEST_APP_PORT}`

  constructor() {
    check(`NEST_APP_HOST`, `NEST_APP_PORT`, `GOOGLE_CALENDAR_SCOPES`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)

    if (envs.GOOGLE_CALENDAR_SCOPES?.length) {
      const opts = {
        clientId: envs.GOOGLE_CLIENT_ID,
        clientSecret: envs.GOOGLE_CLIENT_SECRET,
        redirectUri: `${this.origin}/consumer/auth/google-redirect-new-way`,
      } satisfies Auth.OAuth2ClientOptions
      this.googleapisOauth2Client = new google.auth.OAuth2(opts)
    }
  }

  async googleOAuthNewWay(state: { href: string }) {
    if (!this.googleapisOauth2Client) throw new InternalServerErrorException(`Google API is not initialized`)

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
    if (!this.googleapisOauth2Client) throw new InternalServerErrorException(`Google API is not initialized`)

    const queryCode = _.get(query, `code`, null)
    const response: GetTokenResponse = await this.googleapisOauth2Client.getToken(queryCode)
    const verified = await this.googleapisOauth2Client.verifyIdToken({ idToken: response.tokens.id_token })
    const rawGoogleProfile = new CONSUMER.CreateGoogleProfileDetails(verified.getPayload())
    return rawGoogleProfile
  }
}
