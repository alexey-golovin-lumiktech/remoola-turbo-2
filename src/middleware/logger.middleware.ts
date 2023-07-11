import { Injectable, Logger, NestMiddleware } from '@nestjs/common'
import { NextFunction as IExpressNextFunction, Request as IExpressRequest, Response as IExpressResponse } from 'express'

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(`HTTP`)
  use(req: IExpressRequest, res: IExpressResponse, next: IExpressNextFunction) {
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
