import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { Prisma } from '@prisma/client';
import { ValidationError } from 'class-validator';
import { ApiError } from '../errors/api-error.js';
import { handleValidationError } from '../errors/validation-error.js';
import { handleClientError } from '../errors/client-error.js';
import type { IGenericErrorMessage } from '../interfaces/error.interface.js';
import config from '../../config/index.js';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Something went wrong!';
    let errorMessages: IGenericErrorMessage[] = [];

    // 1. Prisma Validation Errors (schema mismatch, invalid types)
    if (exception instanceof Prisma.PrismaClientValidationError) {
      const simplified = handleValidationError(exception);
      statusCode = simplified.statusCode;
      message = simplified.message;
      errorMessages = simplified.errorMessages;
    }
    // 2. Prisma Known Request Errors (unique constraint P2002, not found P2025, foreign key P2003)
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const simplified = handleClientError(exception);
      statusCode = simplified.statusCode;
      message = simplified.message;
      errorMessages = simplified.errorMessages;
    }
    // 3. Prisma Engine Initialization Errors
    else if (exception instanceof Prisma.PrismaClientInitializationError) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Database connection initialization error.';
      errorMessages = [{ path: '', message }];
      this.logger.error('Prisma Initialization Error:', exception.message);
    }
    // 4. Prisma Rust Engine Panic
    else if (exception instanceof Prisma.PrismaClientRustPanicError) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Critical database engine error.';
      errorMessages = [{ path: '', message }];
      this.logger.error('Prisma Engine Panic:', exception.message);
    }
    // 5. Custom ApiError
    else if (exception instanceof ApiError) {
      statusCode = exception.statusCode;
      message = exception.message;
      errorMessages = exception.errorMessages;
    }
    // 6. DTO Validation Errors (class-validator)
    else if (exception instanceof BadRequestException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse() as Record<string, unknown>;

      if (typeof res === 'object' && res?.['message']) {
        const validationErrors = res['message'];

        if (Array.isArray(validationErrors)) {
          errorMessages = validationErrors.map(
            (error: ValidationError | string) => {
              if (typeof error === 'string') {
                return { path: '', message: error };
              }
              return {
                path: (error as ValidationError).property,
                message: Object.values(
                  (error as ValidationError).constraints || {},
                ).join(', '),
              };
            },
          );
          message = 'Validation failed';
        } else {
          message = String(res['message']);
          errorMessages = [{ path: '', message }];
        }
      } else {
        message = exception.message;
        errorMessages = [{ path: '', message }];
      }
    }
    // 7. General NestJS HttpException
    else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = String(resObj['message'] ?? exception.message);
        if (Array.isArray(resObj['errorMessages'])) {
          errorMessages = resObj['errorMessages'] as IGenericErrorMessage[];
        }
      }

      if (errorMessages.length === 0) {
        errorMessages = [{ path: '', message }];
      }
    }
    // 8. Standard JavaScript syntax errors (e.g. invalid JSON parsing)
    else if (exception instanceof SyntaxError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Syntax error in the request payload.';
      errorMessages = [{ path: '', message }];
    }
    // 9. Multer File Upload Errors
    else if (
      (exception as any)?.name === 'MulterError' ||
      typeof (exception as any)?.code === 'string' && (exception as any).code.startsWith('LIMIT_')
    ) {
      const multerErr = exception as any;
      if (multerErr.code === 'LIMIT_FILE_SIZE') {
        statusCode = HttpStatus.PAYLOAD_TOO_LARGE;
        message = 'Uploaded file exceeds the maximum allowed size (10MB).';
      } else if (multerErr.code === 'LIMIT_FILE_COUNT') {
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'Uploaded files exceed the maximum allowed count.';
      } else {
        statusCode = HttpStatus.BAD_REQUEST;
        message = multerErr.message || 'File upload error.';
      }
      errorMessages = [{ path: multerErr.field || 'file', message }];
    }
    // 10. Unknown/Unhandled Exception Fallback
    else {
      const err =
        exception instanceof Error ? exception : new Error(String(exception));
      this.logger.error(
        `Unhandled Exception on [${request.method}] ${request.url}: ${err.message}`,
        err.stack,
      );
      message = config.isProduction
        ? 'Internal server error'
        : err.message || 'An unexpected error occurred!';
      errorMessages = [{ path: '', message }];
    }

    if (!config.isProduction && config.logVerbose) {
      console.error(
        `[GlobalException] ${request.method} ${request.url} -> ${statusCode}:`,
        errorMessages,
      );
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      errorMessages,
      timestamp: new Date().toISOString(),
      path: request.url,
      stack:
        !config.isProduction && exception instanceof Error
          ? exception.stack
          : undefined,
    });
  }
}
