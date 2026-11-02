import { Prisma } from '@prisma/client';
import type { IGenericErrorMessage } from '../interfaces/error.interface.js';
import type { IGenericErrorResponse } from '../interfaces/response.interface.js';

/**
 * Handle known Prisma client request errors and transform them into clean client responses.
 */
export const handleClientError = (
  error: Prisma.PrismaClientKnownRequestError,
): IGenericErrorResponse => {
  let errors: IGenericErrorMessage[] = [];
  let message = '';
  let statusCode = 400;

  switch (error.code) {
    case 'P2002': {
      // Unique constraint violation (e.g. duplicate email, SKU, slug)
      const target = (error.meta?.target as string[]) || [];
      const field = Array.isArray(target) ? target.join(', ') : 'Field';
      statusCode = 409;
      message = `${field} already exists. Please choose a different value.`;
      errors = [
        {
          path: Array.isArray(target) ? target[0] || '' : '',
          message,
        },
      ];
      break;
    }

    case 'P2025': {
      // Record not found
      statusCode = 404;
      message = (error.meta?.cause as string) || 'Record not found!';
      errors = [
        {
          path: '',
          message,
        },
      ];
      break;
    }

    case 'P2003': {
      // Foreign key constraint failure
      statusCode = 400;
      message =
        'Operation failed due to related records (Foreign key constraint).';
      errors = [
        {
          path: (error.meta?.field_name as string) || '',
          message,
        },
      ];
      break;
    }

    case 'P2014': {
      // Required relation violation
      statusCode = 400;
      message =
        'The change you are trying to make would violate the required relation between records.';
      errors = [{ path: '', message }];
      break;
    }

    default: {
      message = error.message || 'Prisma client known request error';
      errors = [
        {
          path: '',
          message,
        },
      ];
      break;
    }
  }

  return {
    statusCode,
    message,
    errorMessages: errors,
  };
};
