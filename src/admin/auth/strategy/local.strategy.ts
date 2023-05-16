import { Injectable, NotAcceptableException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-local'

import { AuthService } from '../auth.service'

import * as constants from 'src/constants'

@Injectable()
export class AdminLocalStrategy extends PassportStrategy(Strategy, constants.strategy.Local) {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: `email` })
  }

  async validate(email: string, password: string): Promise<any> {
    const admin = await this.authService.getAuthenticatedAdmin(email, password)
    if (!admin) throw new NotAcceptableException(`Could not find the admin`)
    return admin
  }
}
