import { Prisma } from '@prisma/client';
import type { IGenericErrorMessage } from '../interfaces/error.interface.js';
import type { IGenericErrorResponse } from '../interfaces/response.interface.js';

/**
 * Handle Prisma validation errors (e.g. invalid query input types or missing required fields).
 */
export const handleValidationError = (
  error: Prisma.PrismaClientValidationError,
): IGenericErrorResponse => {
  const errors: IGenericErrorMessage[] = [
    {
      path: '',
      message: error.message,
    },
  ];

  return {
    statusCode: 400,
    message: 'Validation Error',
    errorMessages: errors,
  };
};
