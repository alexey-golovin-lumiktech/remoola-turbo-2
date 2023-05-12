import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const AUTH_METADATA = Symbol(`AUTH_METADATA`)

export const Authorization = createParamDecorator((_, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest()
  return request[AUTH_METADATA]
})

export type IAuthIdentity = { id: string; traits: any }
