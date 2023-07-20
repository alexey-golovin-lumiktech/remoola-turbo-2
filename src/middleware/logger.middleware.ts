import { Injectable, Logger, NestMiddleware } from '@nestjs/common'
import express from 'express'

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(`HTTP`)
  use(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (process.env.LONG_LOGS_ENABLED == `yes`) {
      this.logger.log({
        method: req.method,
        url: req.originalUrl,
        body: req.body,
        caller: req.headers.origin ?? req.headers.referer ?? `unknown`,
      })
    }
    next()
  }
}
