import { Body, Controller, Inject, Logger, Post } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { AccessToken, LoginBody } from '../../dtos'
import { AuthService } from './auth.service'
import { ConfigService } from '@nestjs/config'
import { LoginTicket, OAuth2Client } from 'google-auth-library'
import { GoogleProfile } from 'src/dtos/consumer/google-profile.dto'

@ApiTags(`consumer`)
@Controller(`consumer/auth`)
export class AuthController {
  logger = new Logger(AuthController.name)

  constructor(@Inject(AuthService) private readonly service: AuthService, private readonly configService: ConfigService) {}

  @Post(`/login`)
  @ApiOkResponse({ type: AccessToken, status: 200 })
  login(@Body() body: LoginBody): Promise<AccessToken> {
    return this.service.login(body)
  }

  @Post(`/google-login`)
  async googleLogin(@Body() { credential: idToken }: { credential: string }): Promise<any> {
    const audience = this.configService.get<string>(`GOOGLE_CLIENT_ID`)
    const secret = this.configService.get<string>(`GOOGLE_CLIENT_SECRET`)
    const client = new OAuth2Client(audience, secret)
    const verified: LoginTicket = await client.verifyIdToken({ idToken, audience })
    const userID: string = verified.getUserId()
    const profile = new GoogleProfile(userID, verified.getPayload())
    this.logger.log({ from: `consumer/auth/google-login`, profile })
    return `ok`
  }
}
