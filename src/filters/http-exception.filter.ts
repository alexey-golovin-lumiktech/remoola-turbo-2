import { ArgumentsHost, Catch, ExceptionFilter, ForbiddenException, HttpException, HttpStatus, Logger } from '@nestjs/common'
import express from 'express'
import { isEmpty } from 'lodash'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: any | HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
    const hostIncomingMessage = host.getArgByIndex(0)
    const { body, method, url, headers } = hostIncomingMessage

    const caller = headers?.origin ?? headers?.referer ?? headers?.[`user-agent`] ?? `Unknown`
    const name = (exception.name ? exception : this.catch).name
    const message = exception.message ?? `Internal Server Error`
    const error = { url, method, status, name, message, caller, timestamp: new Date().valueOf() }
    if (!isEmpty(body)) Object.assign(error, { body })
    if (name != ForbiddenException.name) this.logger.error(JSON.stringify(error, null, -1))

    ctx.getResponse<express.Response>().status(status).json(error)
  }
}
