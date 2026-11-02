import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Response } from 'express';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator.js';
import { BYPASS_RESPONSE_KEY } from '../decorators/bypass-response.decorator.js';
import type {
  IGenericResponse,
  ResponseParams,
} from '../interfaces/response.interface.js';

@Injectable()
export class ResponseService {
  static formatResponse<T>(params: ResponseParams<T>): IGenericResponse<T> {
    const statusCode = params.statusCode ?? 200;
    return {
      success: params.success ?? (statusCode >= 200 && statusCode < 300),
      statusCode,
      message: params.message || 'Operation successful',
      meta: params.meta,
      data: params.data as T,
    };
  }
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  IGenericResponse<T> | unknown
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<IGenericResponse<T> | unknown> {
    const isBypassed = this.reflector.getAllAndOverride<boolean>(
      BYPASS_RESPONSE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isBypassed) {
      return next.handle();
    }

    const customMessage = this.reflector.getAllAndOverride<string>(
      RESPONSE_MESSAGE_KEY,
      [context.getHandler(), context.getClass()],
    );

    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse<Response>();
    const request = httpContext.getRequest();

    // Bypass health check, documentation, admin queues, and uploads endpoints
    if (
      request.url?.startsWith('/health') ||
      request.url?.startsWith('/docs') ||
      request.url?.startsWith('/admin/queues') ||
      request.url?.startsWith('/uploads')
    ) {
      return next.handle();
    }

    return next.handle().pipe(
      map((result) => {
        const statusCode = response.statusCode || 200;

        // If the handler already returned an envelope with success flag, respect it
        if (
          result !== null &&
          typeof result === 'object' &&
          'success' in result &&
          'data' in result
        ) {
          return {
            statusCode: result.statusCode || statusCode,
            message: customMessage || result.message || 'Operation successful',
            ...result,
          };
        }

        // If returned object contains pagination meta and data separately
        if (
          result !== null &&
          typeof result === 'object' &&
          'meta' in result &&
          'data' in result
        ) {
          return {
            success: true,
            statusCode,
            message: customMessage || 'Operation successful',
            meta: result.meta,
            data: result.data,
          };
        }

        return {
          success: true,
          statusCode,
          message: customMessage || 'Operation successful',
          data: result ?? null,
        };
      }),
    );
  }
}
