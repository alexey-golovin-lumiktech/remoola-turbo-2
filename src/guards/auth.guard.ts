import { CanActivate, createParamDecorator, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { Request as IExpressRequest } from 'express'
import { Observable } from 'rxjs'

import { AdminsService } from 'src/admin/entities/admins/admins.service'
import { ConsumersService } from 'src/consumer/entities/consumers/consumers.service'
import { IS_PUBLIC } from 'src/decorators'
import { IAdminModel, IConsumerModel } from 'src/models'
import { DeepPartialGeneric } from 'src/shared-types'
import { validatePassword } from 'src/utils'

export const REQUEST_AUTH_IDENTITY = Symbol(`REQUEST_AUTH_IDENTITY`)
export const ReqAuthIdentity = createParamDecorator((_, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest()
  return request[REQUEST_AUTH_IDENTITY]
})
export type IReqAuthIdentity = IConsumerModel | IAdminModel

const authHeaderType = { Bearer: `Bearer`, Basic: `Basic` } as const
const authHeaderTypes = Object.values(authHeaderType)
type AuthHeaderType = keyof typeof authHeaderType

const messages = {
  LOST_HEADER: `Lost required authorization header!`,
  PUBLIC_ENDPOINT: `Public endpoint. Skip checking!`,
  UNEXPECTED: (type: string) => `Unexpected auth header type: ${type}`,
  INVALID_CREDENTIALS: `Invalid email or password`,
  INVALID_TOKEN: `Invalid token`,
  NO_IDENTITY: `No identity for given credentials`,
} as const

export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name)
  private readonly separator = { token: ` `, credentials: `:` } as const

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
    if (authorization == null || authorization.length == 0) return this.throwHandler(messages.LOST_HEADER)

    const [type, encoded] = authorization.split(this.separator.token) as [AuthHeaderType, string]
    if (authHeaderTypes.includes(type) == false) return this.throwHandler(messages.UNEXPECTED(type))

    return this.processors[type](encoded, request)
  }

  private readonly processors = {
    [authHeaderType.Basic]: this.basicProcessor.bind(this),
    [authHeaderType.Bearer]: this.bearerProcessor.bind(this),
  }

  private async basicProcessor(encoded: string, request: IExpressRequest) {
    const decoded = Buffer.from(encoded, `base64`).toString(`utf-8`)
    const [email, password] = decoded.split(this.separator.credentials).map(x => x.trim())
    const [consumer] = await this.consumersService.repository.find({ filter: { email } })
    const [admin] = await this.adminsService.repository.find({ filter: { email } })
    const identity = admin ?? consumer
    if (identity == null) return this.throwHandler(messages.NO_IDENTITY)

    const isValidPassword = validatePassword({ incomingPass: password, password: identity.password ?? ``, salt: identity.salt ?? `` })
    if (!isValidPassword) return this.throwHandler(messages.INVALID_CREDENTIALS)

    request[REQUEST_AUTH_IDENTITY] = identity
    return true
  }

  private async bearerProcessor(encoded: string, request: IExpressRequest) {
    const decoded = this.jwtService.decode(encoded)
    if (decoded == null || !decoded[`identityId`]) return this.throwHandler(messages.INVALID_TOKEN)

    const identityId = decoded[`identityId`]
    const admin = await this.adminsService.repository.findById(identityId)
    const consumer = await this.consumersService.repository.findById(identityId)

    const identity = admin ?? consumer
    if (identity == null) return this.throwHandler(messages.NO_IDENTITY)

    request[REQUEST_AUTH_IDENTITY] = identity
    return true
  }

  private throwHandler(message: string): never {
    this.logger.error(message)
    throw new ForbiddenException(message)
  }
}
