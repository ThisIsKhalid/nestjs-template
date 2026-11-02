import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { Request } from 'express';

@Injectable()
export class ParseFormDataInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request: Request = context.switchToHttp().getRequest();

    if (request.body && typeof request.body.data === 'string') {
      try {
        const parsed = JSON.parse(request.body.data);
        request.body = {
          ...request.body,
          ...parsed,
        };
        delete request.body.data;
      } catch {
        throw new BadRequestException('Invalid JSON format in "data" field');
      }
    }

    return next.handle();
  }
}
