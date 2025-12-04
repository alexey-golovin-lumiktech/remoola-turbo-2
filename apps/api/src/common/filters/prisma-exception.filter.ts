import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import express from 'express';

import { Prisma } from '@remoola/database-2';

import { extractPrismaValidationDetails, mapPrismaKnownError } from './utils';

/**
 * Robustly extracts details from PrismaClientValidationError across versions.
 * Returns a concise human-readable sentence with best-effort structure.
 */

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<express.Response>();

    let status = HttpStatus.BAD_REQUEST;
    let message = `Database error`;
    let details: string | string[] | undefined;

    if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = extractPrismaValidationDetails(exception);
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const known = mapPrismaKnownError(exception);
      status = known.status;
      message = known.message;
      details = known.details;
    }

    response.status(status).json({
      statusCode: status,
      error: message,
      details,
    });
  }
}
