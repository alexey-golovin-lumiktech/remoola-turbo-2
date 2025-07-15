import { Injectable, Logger, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'

import { envs } from '../envs'

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(`HTTP`)

  use(req: Request, res: Response, next: NextFunction) {
    if (envs.LONG_LOGS_ENABLED) {
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
