import { CanActivate, createParamDecorator, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { Request as IExpressRequest } from 'express'
import { Observable } from 'rxjs'

import { AdminsService } from 'src/admin/entities/admins/admins.service'
import { ConsumersService } from 'src/consumer/entities/consumers/consumers.service'
import { IS_PUBLIC } from 'src/decorators'
import { DeepPartialGeneric } from 'src/shared-types'
import { validatePassword } from 'src/utils'

export const IDENTITY_METADATA = Symbol(`IDENTITY_METADATA`)
export const Identity = createParamDecorator((_, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest()
  return request[IDENTITY_METADATA]
})

const authHeaderType = { Bearer: `Bearer`, Basic: `Basic` } as const
const authHeaderTypes = Object.values(authHeaderType)
type AuthHeaderType = keyof typeof authHeaderType

const messages = {
  LOST_HEADER: `Lost required authorization header!`,
  PUBLIC_ENDPOINT: `Public endpoint. Skip checking!`,
  UNEXPECTED: (type: string) => `Unexpected auth header type: ${type}`,
  INVALID_CREDENTIALS: `Invalid email or password`,
} as const

export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name)
  private readonly separator = ` `

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly consumersService: ConsumersService,
    private readonly adminsService: AdminsService,
    private readonly options?: DeepPartialGeneric,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request: IExpressRequest = context.switchToHttp().getRequest()
    const isPublic = this.reflector.get<boolean>(IS_PUBLIC, context.getHandler())
    if (isPublic) {
      this.logger.log(messages.PUBLIC_ENDPOINT)
      return true
    }

    const { authorization = null } = request.headers
    if (authorization == null) {
      this.logger.error(messages.LOST_HEADER)
      throw new ForbiddenException(messages.LOST_HEADER)
    }

    const [type, encoded] = authorization.split(this.separator) as [AuthHeaderType, string]
    if (authHeaderTypes.includes(type) == false) {
      this.logger.error(messages.UNEXPECTED(type))
      throw new ForbiddenException(messages.UNEXPECTED(type))
    }

    return this.processors[type](encoded, request)
  }

  private readonly processors = {
    [authHeaderType.Basic]: this.basicProcessor.bind(this),
    [authHeaderType.Bearer]: this.bearerProcessor.bind(this),
  }

  private async basicProcessor(encoded: string, request: IExpressRequest) {
    const decoded = Buffer.from(encoded, `base64`).toString(`utf-8`)
    const [email, password] = decoded.split(`:`).map(x => x.trim())
    const [consumer] = await this.consumersService.repository.find({ filter: { email } })
    const [admin] = await this.adminsService.repository.find({ filter: { email } })
    const identity = admin ?? consumer
    const isValidPassword = validatePassword({ incomingPass: password, password: identity.password ?? ``, salt: identity.salt ?? `` })
    if (!isValidPassword) {
      this.logger.error(messages.INVALID_CREDENTIALS)
      throw new ForbiddenException(messages.INVALID_CREDENTIALS)
    }

    request[IDENTITY_METADATA] = identity
    return true
  }

  private async bearerProcessor(encoded: string) {
    const verified = this.jwtService.verify(encoded)
    const decoded = this.jwtService.decode(encoded)

    console.log(`\n********************************************`)
    console.log(`[verified]`, verified)
    console.log(`[decoded]`, decoded)
    console.log(`********************************************\n`)
    return true
  }
}
