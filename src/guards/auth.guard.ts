import { CanActivate, createParamDecorator, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import express from 'express'
import { Observable } from 'rxjs'
import { IJwtTokenPayload } from 'src/dtos/consumer'
import { AccessRefreshTokenRepository } from 'src/repositories'

import { AuthHeader, CredentialsSeparator } from '@wirebill/shared-common/enums'
import { IAdminModel, IConsumerModel } from '@wirebill/shared-common/models'
import { AuthHeaderValue } from '@wirebill/shared-common/types'

import { AdminService } from '../admin/entities/admin/admin.service'
import { commonUtils } from '../common-utils'
import { ConsumerService } from '../consumer/entities/consumer/consumer.service'
import { IS_PUBLIC } from '../decorators'

export const REQUEST_AUTH_IDENTITY = Symbol(`REQUEST_AUTH_IDENTITY`)
export const ReqAuthIdentity = createParamDecorator((_, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest()
  return request[REQUEST_AUTH_IDENTITY]
})
export type IReqAuthIdentity = IConsumerModel | IAdminModel

const GuardMessage = {
  LOST_HEADER: `[AuthGuard] lost required authorization header!`,
  PUBLIC_ENDPOINT: `[AuthGuard] public endpoint. skip checking!`,
  UNEXPECTED: (type: string) => `[AuthGuard] unexpected auth header type: ${type}`,
  INVALID_CREDENTIALS: `[AuthGuard] invalid email or password`,
  INVALID_TOKEN: `[AuthGuard] invalid token`,
  PROVIDED_TOKEN_IS_EXPIRED_OR_NOT_IN_REPOSITORY: `[AuthGuard] provided token is expired or not in repository`,
  NO_IDENTITY: `[AuthGuard] no identity for given credentials.`,
  NOT_VERIFIED: `[AuthGuard] probably your email address is not verified yet. Check you email address`,
  ONLY_FOR_ADMINS: `[AuthGuard] only for admins`,
  ONLY_FOR_CONSUMERS: `[AuthGuard] only for consumers`,
} as const

export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name)
  private readonly separator = CredentialsSeparator

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly consumersService: ConsumerService,
    private readonly adminsService: AdminService,
    private readonly accessRefreshTokenRepository: AccessRefreshTokenRepository,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request: express.Request = context.switchToHttp().getRequest()
    const isPublic = this.reflector.get<boolean>(IS_PUBLIC, context.getHandler())
    if (isPublic) {
      this.logger.log(GuardMessage.PUBLIC_ENDPOINT)
      return true
    }

    const { authorization = null } = request.headers
    if (authorization == null || authorization.length == 0) return this.throwError(GuardMessage.LOST_HEADER)

    const [type, encoded] = authorization.split(this.separator.Token) as [AuthHeaderValue, string]
    if (Object.values(AuthHeader).includes(type) == false) return this.throwError(GuardMessage.UNEXPECTED(type))

    return this.processors[type](encoded, request)
  }

  private readonly processors = {
    [AuthHeader.Basic]: this.basicProcessor.bind(this),
    [AuthHeader.Bearer]: this.bearerProcessor.bind(this),
  }

  private async basicProcessor(encoded: string, request: express.Request) {
    const decoded = Buffer.from(encoded, `base64`).toString(`utf-8`)
    const [email, password] = decoded.split(this.separator.Credentials).map(x => x.trim())
    const admin = await this.adminsService.repository.findOne({ email })
    const consumer = await this.consumersService.repository.findOne({ email })
    const identity = admin ?? consumer

    if (identity == null) return this.throwError(GuardMessage.NO_IDENTITY)
    if (request.url.startsWith(`/admin/`) && !admin) return this.throwError(GuardMessage.ONLY_FOR_ADMINS)
    if (request.url.startsWith(`/consumer/`) && !consumer) return this.throwError(GuardMessage.ONLY_FOR_CONSUMERS)
    if ((identity as IConsumerModel).verified == false) return this.throwError(GuardMessage.NOT_VERIFIED)

    const isValidPassword = commonUtils.validatePassword({
      incomingPass: password,
      password: identity.password ?? ``,
      salt: identity.salt ?? ``,
    })
    if (!isValidPassword) return this.throwError(GuardMessage.INVALID_CREDENTIALS)

    request[REQUEST_AUTH_IDENTITY] = Object.assign(identity, { type: admin ? `admin` : `consumer` })
    return true
  }

  private async bearerProcessor(accessToken: string, request: express.Request) {
    const verified = this.jwtService.verify<IJwtTokenPayload>(accessToken)
    if (verified == null) return this.throwError(`[AuthGuard][bearerProcessor] invalid token. no verified`)
    if (!verified.identityId) return this.throwError(`[AuthGuard][bearerProcessor] invalid token. no identity id`)

    const access = await this.accessRefreshTokenRepository.findOne({ identityId: verified.identityId, accessToken })
    if (access == null) this.throwError(GuardMessage.PROVIDED_TOKEN_IS_EXPIRED_OR_NOT_IN_REPOSITORY)

    const admin = await this.adminsService.repository.findById(verified.identityId)
    const consumer = await this.consumersService.repository.findById(verified.identityId)
    const identity = admin ?? consumer

    if (identity == null) return this.throwError(GuardMessage.NO_IDENTITY)
    if (request.url.startsWith(`/admin/`) && !admin) return this.throwError(GuardMessage.ONLY_FOR_ADMINS)
    if (request.url.startsWith(`/consumer/`) && !consumer) return this.throwError(GuardMessage.ONLY_FOR_CONSUMERS)

    request[REQUEST_AUTH_IDENTITY] = Object.assign(identity, { type: admin ? `admin` : `consumer` })
    return true
  }

  private throwError(message: string): never {
    this.logger.error(message)

    throw new ForbiddenException(message)
  }
}
