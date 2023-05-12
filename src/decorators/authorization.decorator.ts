import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const AUTHORIZATION_METADATA = Symbol(`__AUTHORIZATION_METADATA__`)

export const Authorization = createParamDecorator((_, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest()
  return request[AUTHORIZATION_METADATA]
})

export type IAuthIdentity = { id: string; traits: any }
