import { ArgumentsHost, Catch, ExceptionFilter, ForbiddenException, HttpException, HttpStatus, Logger } from '@nestjs/common'
import express from 'express'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: any, host: ArgumentsHost) {
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
    const hostIncomingMessage = host.getArgByIndex(0)
    const { body, method, url } = hostIncomingMessage

    const message = (exception.detail || exception.message || exception.exception || `Internal server error`).replaceAll(`\"`, `\``)
    const caller = hostIncomingMessage.headers.origin ?? hostIncomingMessage.headers.referer ?? `Unknown`

    if (exception.name != ForbiddenException.name) {
      this.logger.error({
        caller: caller ?? (exception.name ? exception : this.catch).name,
        error: { message, method, url, response: exception.response, status },
        payload: { body, caller },
      })
    }

    const ctx = host.switchToHttp()
    const res = ctx.getResponse<express.Response>()
    res.status(status).json(exception.response ?? { statusCode: status, message })
  }
}
