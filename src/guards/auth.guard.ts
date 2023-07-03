import { CanActivate, createParamDecorator, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { Request as IExpressRequest } from 'express'
import { Observable } from 'rxjs'

import { AuthHeader, CredentialsSeparator } from '@wirebill/shared-common/enums'
import { IAdminModel, IConsumerModel } from '@wirebill/shared-common/models'
import { AuthHeaderValue } from '@wirebill/shared-common/types'

import { AdminService } from '../admin/entities/admin/admin.service'
import { ConsumerService } from '../consumer/entities/consumer/consumer.service'
import { IS_PUBLIC } from '../decorators'
import { validatePassword } from '../utils'

export const REQUEST_AUTH_IDENTITY = Symbol(`REQUEST_AUTH_IDENTITY`)
export const ReqAuthIdentity = createParamDecorator((_, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest()
  return request[REQUEST_AUTH_IDENTITY]
})
export type IReqAuthIdentity = IConsumerModel | IAdminModel

const GuardMessage = {
  LOST_HEADER: `Lost required authorization header!`,
  PUBLIC_ENDPOINT: `Public endpoint. Skip checking!`,
  UNEXPECTED: (type: string) => `Unexpected auth header type: ${type}`,
  INVALID_CREDENTIALS: `Invalid email or password`,
  INVALID_TOKEN: `Invalid token`,
  NO_IDENTITY: `No identity for given credentials.`,
  NOT_VERIFIED: `Probably your email address is not verified yet. Check you email address`,
} as const

export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name)
  private readonly separator = CredentialsSeparator

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly consumersService: ConsumerService,
    private readonly adminsService: AdminService,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request: IExpressRequest = context.switchToHttp().getRequest()
    const isPublic = this.reflector.get<boolean>(IS_PUBLIC, context.getHandler())
    if (isPublic) {
      this.logger.log(GuardMessage.PUBLIC_ENDPOINT)
      return true
    }

    const { authorization = null } = request.headers
    if (authorization == null || authorization.length == 0) return this.throwHandler(GuardMessage.LOST_HEADER)

    const [type, encoded] = authorization.split(this.separator.Token) as [AuthHeaderValue, string]
    if (Object.values(AuthHeader).includes(type) == false) return this.throwHandler(GuardMessage.UNEXPECTED(type))

    return this.processors[type](encoded, request)
  }

  private readonly processors = {
    [AuthHeader.Basic]: this.basicProcessor.bind(this),
    [AuthHeader.Bearer]: this.bearerProcessor.bind(this),
  }

  private async basicProcessor(encoded: string, request: IExpressRequest) {
    const decoded = Buffer.from(encoded, `base64`).toString(`utf-8`)
    const [email, password] = decoded.split(this.separator.Credentials).map(x => x.trim())
    const [consumer] = await this.consumersService.repository.find({ filter: { email } })
    const [admin] = await this.adminsService.repository.find({ filter: { email } })
    const identity = admin ?? consumer
    if (identity == null) return this.throwHandler(GuardMessage.NO_IDENTITY)
    if ((identity as IConsumerModel).verified == false) return this.throwHandler(GuardMessage.NOT_VERIFIED)

    const isValidPassword = validatePassword({ incomingPass: password, password: identity.password ?? ``, salt: identity.salt ?? `` })
    if (!isValidPassword) return this.throwHandler(GuardMessage.INVALID_CREDENTIALS)

    request[REQUEST_AUTH_IDENTITY] = identity
    return true
  }

  private async bearerProcessor(encoded: string, request: IExpressRequest) {
    const decoded = this.jwtService.decode(encoded)
    if (decoded == null || !decoded[`identityId`]) return this.throwHandler(GuardMessage.INVALID_TOKEN)

    const identityId = decoded[`identityId`]
    const admin = await this.adminsService.repository.findById(identityId)
    const consumer = await this.consumersService.repository.findById(identityId)

    const identity = admin ?? consumer
    if (identity == null) return this.throwHandler(GuardMessage.NO_IDENTITY)

    request[REQUEST_AUTH_IDENTITY] = identity
    return true
  }

  private throwHandler(message: string): never {
    this.logger.error(message)
    throw new ForbiddenException(message)
  }
}
