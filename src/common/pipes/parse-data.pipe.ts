import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Injectable()
export class ParseDataPipe implements PipeTransform {
  async transform(value: Record<string, unknown>, metadata: ArgumentMetadata) {
    try {
      // Step 1: If value.data is a stringified JSON, parse it
      const parsedData =
        typeof value?.data === 'string'
          ? JSON.parse(value.data as string)
          : value;

      // Step 2: Apply class-validator on the parsed DTO object if metadata type is provided
      if (metadata.metatype && typeof metadata.metatype === 'function') {
        const dtoObject = plainToInstance(metadata.metatype, parsedData);
        const errors = await validate(dtoObject, {
          whitelist: true,
          forbidNonWhitelisted: true,
        });

        if (errors.length > 0) {
          const errorMessages = errors.flatMap((err) =>
            Object.values(err.constraints || {}).map((msg) => ({
              path: err.property,
              message: msg,
            })),
          );

          throw new BadRequestException({
            success: false,
            message: 'Validation failed',
            errorMessages,
          });
        }

        return dtoObject;
      }

      return parsedData;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message:
          (error as Error).message ||
          'Invalid data format or structure in body',
        errorMessages: [],
      });
    }
  }
}
