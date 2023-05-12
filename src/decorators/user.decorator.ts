import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const REQUEST_USER = Symbol(`user`)
export const RequestUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest()
  return request[REQUEST_USER]
})
