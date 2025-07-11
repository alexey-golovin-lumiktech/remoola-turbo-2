import { Injectable, Logger, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(`HTTP`)
  private readonly longLogsEnabled = process.env.LONG_LOGS_ENABLED === `yes`

  use(req: Request, res: Response, next: NextFunction) {
    if (this.longLogsEnabled) {
      const {
        method,
        originalUrl,
        body,
        headers: { origin, referer },
      } = req
      const caller = origin ?? referer ?? `unknown`
      this.logger.log({ method, url: originalUrl, body, caller })
    }
    next()
  }
}
