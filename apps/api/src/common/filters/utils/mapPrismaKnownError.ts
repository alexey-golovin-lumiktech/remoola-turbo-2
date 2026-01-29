import { HttpStatus } from '@nestjs/common';

import { type Prisma } from '@remoola/database-2';

export function mapPrismaKnownError(error: Prisma.PrismaClientKnownRequestError): {
  status: number;
  message: string;
  details?: string | string[];
} {
  let status = HttpStatus.INTERNAL_SERVER_ERROR;
  let message = `Unexpected database error`;
  let details: string | string[] | undefined;

  switch (error.code) {
    /* ---------------------------------------------------------------------- */
    /*                         Constraint & Validation                        */
    /* ---------------------------------------------------------------------- */

    case `P2000`:
      // Value too long for column type
      status = HttpStatus.BAD_REQUEST;
      message = `Input value too long for column`;
      details = error.meta?.target as string[];
      break;

    case `P2001`:
      // Record not found where expected
      status = HttpStatus.NOT_FOUND;
      message = `Record not found`;
      details = error.meta?.cause as string;
      break;

    case `P2002`:
      // Unique constraint failed
      status = HttpStatus.CONFLICT;
      message = `Unique constraint failed`;
      details = error.meta?.target as string[];
      break;

    case `P2003`:
      // Foreign key constraint failed
      status = HttpStatus.BAD_REQUEST;
      message = `Foreign key constraint failed`;
      details = error.meta?.field_name as string;
      break;

    case `P2004`:
      // Constraint failed (check constraint)
      status = HttpStatus.BAD_REQUEST;
      message = `Database constraint violation`;
      details = error.meta?.constraint as string;
      break;

    case `P2005`:
      // Invalid value for field type
      status = HttpStatus.BAD_REQUEST;
      message = `Invalid value for field type`;
      details = error.meta?.field_name as string;
      break;

    case `P2006`:
      // Invalid value for field
      status = HttpStatus.BAD_REQUEST;
      message = `Invalid value for field`;
      details = error.meta?.field_name as string;
      break;

    case `P2007`:
      // Data validation error (internal)
      status = HttpStatus.BAD_REQUEST;
      message = `Data validation error`;
      break;

    case `P2008`:
      status = HttpStatus.BAD_REQUEST;
      message = `Query parsing failed`;
      break;

    case `P2009`:
      status = HttpStatus.BAD_REQUEST;
      message = `Query validation failed`;
      break;

    case `P2010`:
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = `Raw query failed`;
      details = error.meta?.cause as string;
      break;

    /* ---------------------------------------------------------------------- */
    /*                          Record & Relation Errors                      */
    /* ---------------------------------------------------------------------- */

    case `P2011`:
      status = HttpStatus.BAD_REQUEST;
      message = `Null constraint violation`;
      details = error.meta?.constraint as string;
      break;

    case `P2012`:
      status = HttpStatus.BAD_REQUEST;
      message = `Missing required value`;
      details = error.meta?.path as string;
      break;

    case `P2013`:
      status = HttpStatus.BAD_REQUEST;
      message = `Missing required argument`;
      details = error.meta?.argument_name as string;
      break;

    case `P2014`:
      status = HttpStatus.BAD_REQUEST;
      message = `Invalid relation reference`;
      details = error.meta?.relation_name as string;
      break;

    case `P2015`:
      status = HttpStatus.NOT_FOUND;
      message = `Related record not found`;
      details = error.meta?.details as string;
      break;

    case `P2016`:
      status = HttpStatus.BAD_REQUEST;
      message = `Query interpretation error`;
      details = error.meta?.details as string;
      break;

    case `P2017`:
      status = HttpStatus.BAD_REQUEST;
      message = `Records for relation not connected`;
      details = error.meta?.details as string;
      break;

    case `P2018`:
      status = HttpStatus.NOT_FOUND;
      message = `Required connected records not found`;
      break;

    case `P2019`:
      status = HttpStatus.BAD_REQUEST;
      message = `Input error during query construction`;
      break;

    case `P2020`:
      status = HttpStatus.BAD_REQUEST;
      message = `Value out of range`;
      details = error.meta?.details as string;
      break;

    case `P2021`:
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = `Table does not exist`;
      details = error.meta?.table as string;
      break;

    case `P2022`:
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = `Column does not exist`;
      details = error.meta?.column as string;
      break;

    case `P2023`:
      status = HttpStatus.BAD_REQUEST;
      message = `Invalid ID or value type`;
      break;

    case `P2024`:
      status = HttpStatus.REQUEST_TIMEOUT;
      message = `Operation timed out`;
      break;

    case `P2025`:
      status = HttpStatus.NOT_FOUND;
      message = `Record not found`;
      details = error.meta?.cause as string;
      break;

    case `P2026`:
      status = HttpStatus.BAD_REQUEST;
      message = `Unsupported feature`;
      details = error.meta?.feature as string;
      break;

    /* ---------------------------------------------------------------------- */
    /*                          Connection / Transaction                      */
    /* ---------------------------------------------------------------------- */

    case `P2027`:
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = `Multiple database errors occurred`;
      break;

    case `P2028`:
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = `Transaction API error`;
      details = error.meta?.details as string;
      break;

    case `P2029`:
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = `Query parameter limit exceeded`;
      break;

    case `P2030`:
      status = HttpStatus.BAD_REQUEST;
      message = `Cannot find fulltext index for search`;
      details = error.meta?.target as string;
      break;

    case `P2031`:
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = `Prisma query engine exited unexpectedly`;
      break;

    case `P2033`:
      status = HttpStatus.BAD_REQUEST;
      message = `Invalid JSON value`;
      details = error.meta?.field_name as string;
      break;

    case `P2034`:
      status = HttpStatus.BAD_REQUEST;
      message = `Transaction already closed`;
      break;

    case `P2035`:
      status = HttpStatus.UNAUTHORIZED;
      message = `Insufficient database permissions`;
      break;

    case `P2036`:
      status = HttpStatus.BAD_REQUEST;
      message = `Data integrity violation`;
      break;

    case `P2037`:
      status = HttpStatus.BAD_REQUEST;
      message = `Missing required database field`;
      break;

    case `P2038`:
      status = HttpStatus.BAD_REQUEST;
      message = `Too many nested writes or reads`;
      break;

    /* ---------------------------------------------------------------------- */
    /*                                 Default                                */
    /* ---------------------------------------------------------------------- */

    default:
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = `Unhandled Prisma error (${error.code})`;
      details = error.message;
      break;
  }

  return { status, message, details };
}
