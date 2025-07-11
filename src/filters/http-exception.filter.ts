import { ArgumentsHost, Catch, ExceptionFilter, ForbiddenException, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { Request, Response } from 'express'
import { isEmpty } from 'lodash'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

    const { body, method, url, headers } = request
    const caller = headers.origin ?? headers.referer ?? headers[`user-agent`] ?? `Unknown`
    const name = exception instanceof Error ? exception.name : `UnknownException`
    const message = exception instanceof Error ? exception.message : `Internal Server Error`

    const errorResponse = {
      url,
      method,
      status,
      name,
      message,
      caller,
      timestamp: new Date().toISOString(),
      ...(isEmpty(body) ? {} : { body }),
    }

    if (name !== ForbiddenException.name) {
      this.logger.error(JSON.stringify(errorResponse, null, 2))
    }

    response.status(status).json(errorResponse)
  }
}
