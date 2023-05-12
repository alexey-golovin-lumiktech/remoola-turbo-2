import { Injectable, Logger, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(`HTTP`)
  use(req: Request, res: Response, next: NextFunction) {
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
