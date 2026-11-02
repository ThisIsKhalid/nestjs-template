import { HttpException, HttpStatus } from '@nestjs/common';
import type { IGenericErrorMessage } from '../interfaces/error.interface.js';

export class ApiError extends HttpException {
  public readonly errorMessages: IGenericErrorMessage[];

  constructor(
    public readonly statusCode: number = HttpStatus.BAD_REQUEST,
    public readonly message: string = 'Something went wrong!',
    errors?: IGenericErrorMessage[] | string,
    stack?: string,
  ) {
    super(message, statusCode);

    if (Array.isArray(errors)) {
      this.errorMessages = errors;
    } else if (typeof errors === 'string') {
      this.errorMessages = [{ path: '', message: errors }];
    } else {
      this.errorMessages = [{ path: '', message }];
    }

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
