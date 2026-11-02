import {
  FileInterceptor,
  FilesInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { slugify } from '../utils/slugify.util.js';
import { createOptimizedStorage } from '../utils/optimized-storage.util.js';

export interface CustomUploadOptions {
  maxSizeInBytes?: number; // default: 50MB
  allowedMimeTypes?: string[]; // default: images, videos, pdfs
}

const DEFAULT_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
];

const DEFAULT_MAX_SIZE = process.env.MAX_MEDIA_FILE_SIZE
  ? Number(process.env.MAX_MEDIA_FILE_SIZE)
  : 10 * 1024 * 1024; // 10MB max default

/**
 * Format a filename to be URL-safe, SEO-friendly, and collision-free.
 * Output format: {slugified-name}__SUF_{uuid-fragment}-{timestamp}{extension}
 */
export const formatFilename = (originalname: string): string => {
  const extension = path.extname(originalname).toLowerCase();
  const rawBaseName = path.basename(originalname, extension);
  const safeBaseName = slugify(rawBaseName) || 'file';
  const uniqueFragment = randomUUID().replace(/-/g, '').slice(0, 8);
  const timestamp = Date.now();

  return `${safeBaseName}__SUF_${uniqueFragment}-${timestamp}${extension}`;
};

/**
 * Helper to construct disk storage with automatic directory creation and WebP compression.
 */
const createDiskStorage = (uploadPath: string) => {
  return createOptimizedStorage({
    destination: uploadPath,
    filename: (_req: Request, file, callback) => {
      callback(null, formatFilename(file.originalname));
    },
  });
};

/**
 * Common file filter for allowed MIME types and safety.
 */
const createFileFilter = (allowedTypes: string[]) => {
  return (
    _req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (allowedTypes.length === 0 || allowedTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(
        new BadRequestException(
          `File type ${file.mimetype} is not allowed. Supported types: ${allowedTypes.join(', ')}`,
        ),
        false,
      );
    }
  };
};

/**
 * Single File Upload Interceptor.
 * Usage: @UseInterceptors(CustomFileInterceptor('image', 'uploads/products'))
 */
export const CustomFileInterceptor = (
  fieldName: string,
  uploadPath: string = 'uploads',
  options: CustomUploadOptions = {},
) => {
  const allowedMimeTypes =
    options.allowedMimeTypes ?? DEFAULT_ALLOWED_MIME_TYPES;
  const maxSize = options.maxSizeInBytes ?? DEFAULT_MAX_SIZE;

  return FileInterceptor(fieldName, {
    storage: createDiskStorage(uploadPath),
    limits: { fileSize: maxSize },
    fileFilter: createFileFilter(allowedMimeTypes),
  });
};

/**
 * Multiple Files Upload Interceptor under the same field name.
 * Usage: @UseInterceptors(CustomFilesInterceptor('gallery', 10, 'uploads/products/gallery'))
 */
export const CustomFilesInterceptor = (
  fieldName: string,
  maxCount: number = 10,
  uploadPath: string = 'uploads',
  options: CustomUploadOptions = {},
) => {
  const allowedMimeTypes =
    options.allowedMimeTypes ?? DEFAULT_ALLOWED_MIME_TYPES;
  const maxSize = options.maxSizeInBytes ?? DEFAULT_MAX_SIZE;

  return FilesInterceptor(fieldName, maxCount, {
    storage: createDiskStorage(uploadPath),
    limits: { fileSize: maxSize },
    fileFilter: createFileFilter(allowedMimeTypes),
  });
};

/**
 * Multiple File Fields Upload Interceptor for distinct fields (e.g. thumbnail + gallery images).
 * Usage: @UseInterceptors(CustomFileFieldsInterceptor([{ name: 'thumbnail', maxCount: 1 }, { name: 'gallery', maxCount: 8 }]))
 */
export const CustomFileFieldsInterceptor = (
  fields: Array<{ name: string; maxCount?: number }>,
  uploadPath: string = 'uploads',
  options: CustomUploadOptions = {},
) => {
  const allowedMimeTypes =
    options.allowedMimeTypes ?? DEFAULT_ALLOWED_MIME_TYPES;
  const maxSize = options.maxSizeInBytes ?? DEFAULT_MAX_SIZE;

  return FileFieldsInterceptor(fields, {
    storage: createDiskStorage(uploadPath),
    limits: { fileSize: maxSize },
    fileFilter: createFileFilter(allowedMimeTypes),
  });
};
