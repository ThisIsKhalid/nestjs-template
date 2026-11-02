import type { StorageEngine } from 'multer';
import type { Request } from 'express';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PassThrough, pipeline } from 'node:stream';
import sharp from 'sharp';
import { Upload } from '@aws-sdk/lib-storage';
import { config } from '../../config/index.js';
import {
  getS3Client,
  isS3Configured,
  getS3Url,
  deleteS3Object,
} from './s3-client.util.js';

export interface ImageOptimizationOptions {
  maxWidth?: number; // default: 1920
  maxHeight?: number; // default: 1920
  quality?: number; // default: 82 (visually lossless)
  effort?: number; // default: 4 (compression effort 1-6)
}

export interface OptimizedStorageOptions {
  destination:
    | string
    | ((
        req: Request,
        file: Express.Multer.File,
        cb: (error: Error | null, destination: string) => void,
      ) => void);
  filename?: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void,
  ) => void;
  imageOptions?: ImageOptimizationOptions;
}

export const COMPRESSIBLE_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/tiff',
]);

export class OptimizedDiskStorage implements StorageEngine {
  private destination: OptimizedStorageOptions['destination'];
  private filename?: OptimizedStorageOptions['filename'];
  private imageOptions: ImageOptimizationOptions;

  constructor(options: OptimizedStorageOptions) {
    this.destination = options.destination;
    this.filename = options.filename;
    this.imageOptions = {
      maxWidth: options.imageOptions?.maxWidth ?? 1920,
      maxHeight: options.imageOptions?.maxHeight ?? 1920,
      quality: options.imageOptions?.quality ?? 82,
      effort: options.imageOptions?.effort ?? 4,
    };
  }

  private getDestination(
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void,
  ) {
    if (typeof this.destination === 'string') {
      const fullPath = path.isAbsolute(this.destination)
        ? this.destination
        : path.resolve(process.cwd(), this.destination);

      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
      cb(null, fullPath);
    } else {
      this.destination(req, file, (err, dest) => {
        if (err) return cb(err, '');
        const fullPath = path.isAbsolute(dest)
          ? dest
          : path.resolve(process.cwd(), dest);
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true });
        }
        cb(null, fullPath);
      });
    }
  }

  private getFilename(
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void,
  ) {
    if (this.filename) {
      this.filename(req, file, cb);
    } else {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    }
  }

  _handleFile(
    req: Request,
    file: Express.Multer.File,
    callback: (error?: any, info?: Partial<Express.Multer.File>) => void,
  ): void {
    this.getFilename(req, file, async (nameErr, rawFilename) => {
      if (nameErr) return callback(nameErr);

      const isRasterImage = COMPRESSIBLE_IMAGE_MIMES.has(file.mimetype);

      // If it's a compressible raster image, guarantee .webp extension
      let finalFilename = rawFilename;
      if (isRasterImage) {
        const currentExt = path.extname(rawFilename);
        const baseName = currentExt
          ? rawFilename.slice(0, rawFilename.length - currentExt.length)
          : rawFilename;
        finalFilename = `${baseName}.webp`;
      }

      // Check if S3 upload should be used
      const useS3 = config.storageDriver === 's3' && isS3Configured();

      if (useS3) {
        try {
          const subFolder = file.mimetype.startsWith('video/')
            ? 'videos'
            : 'images';

          const s3Key = config.aws.prefix
            ? `${config.aws.prefix}/${subFolder}/${finalFilename}`
            : `${subFolder}/${finalFilename}`;

          const passThrough = new PassThrough();
          let byteCount = 0;
          passThrough.on('data', (chunk) => {
            byteCount += chunk.length;
          });

          const finalMime = isRasterImage ? 'image/webp' : file.mimetype;

          const upload = new Upload({
            client: getS3Client(),
            params: {
              Bucket: config.aws.bucket,
              Key: s3Key,
              Body: passThrough,
              ContentType: finalMime,
              CacheControl: 'public, max-age=31536000, immutable',
            },
          });

          let hasError = false;
          const handleError = (err: any) => {
            if (hasError) return;
            hasError = true;
            try {
              upload.abort();
            } catch {
              // Ignore abort error
            }
            callback(err);
          };

          file.stream.on('error', handleError);
          passThrough.on('error', handleError);

          if (isRasterImage) {
            const transformer = sharp()
              .rotate() // Auto-orient based on EXIF tag (e.g. mobile camera)
              .resize({
                width: this.imageOptions.maxWidth,
                height: this.imageOptions.maxHeight,
                fit: 'inside',
                withoutEnlargement: true,
              })
              .webp({
                quality: this.imageOptions.quality,
                effort: this.imageOptions.effort,
                smartSubsample: true,
              });

            transformer.on('error', handleError);
            file.stream.pipe(transformer).pipe(passThrough);
          } else {
            file.stream.pipe(passThrough);
          }

          const uploadResult = await upload.done();
          if (hasError) return;

          const publicUrl = getS3Url(s3Key);

          // Attach S3 details to file object for downstream consumers
          (file as any).location = publicUrl;
          (file as any).key = s3Key;
          (file as any).storageKey = s3Key;
          (file as any).bucket = config.aws.bucket;

          callback(null, {
            destination: `s3://${config.aws.bucket}/${s3Key}`,
            filename: finalFilename,
            path: publicUrl,
            size: byteCount || 0,
            mimetype: finalMime,
          });
        } catch (s3Err) {
          callback(s3Err);
        }
        return;
      }

      // Local disk storage fallback
      this.getDestination(req, file, (destErr, destination) => {
        if (destErr) return callback(destErr);

        const finalPath = path.join(destination, finalFilename);
        const outStream = fs.createWriteStream(finalPath);

        const cleanup = () => {
          if (fs.existsSync(finalPath)) {
            fs.unlink(finalPath, () => {});
          }
        };

        if (isRasterImage) {
          const transformer = sharp()
            .rotate()
            .resize({
              width: this.imageOptions.maxWidth,
              height: this.imageOptions.maxHeight,
              fit: 'inside',
              withoutEnlargement: true,
            })
            .webp({
              quality: this.imageOptions.quality,
              effort: this.imageOptions.effort,
              smartSubsample: true,
            });

          pipeline(file.stream, transformer, outStream, (err) => {
            if (err) {
              cleanup();
              return callback(err);
            }
            callback(null, {
              destination,
              filename: finalFilename,
              path: finalPath,
              size: outStream.bytesWritten,
              mimetype: 'image/webp',
            });
          });
        } else {
          // Direct stream for videos, SVGs, PDFs, etc.
          pipeline(file.stream, outStream, (err) => {
            if (err) {
              cleanup();
              return callback(err);
            }
            callback(null, {
              destination,
              filename: finalFilename,
              path: finalPath,
              size: outStream.bytesWritten,
              mimetype: file.mimetype,
            });
          });
        }
      });
    });
  }

  _removeFile(
    _req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null) => void,
  ): void {
    const s3Key = (file as any)?.key || (file as any)?.storageKey;
    if (s3Key) {
      deleteS3Object(s3Key)
        .then(() => callback(null))
        .catch((err) => callback(err));
      return;
    }

    if (file.path && fs.existsSync(file.path)) {
      fs.unlink(file.path, (err) => {
        callback(err || null);
      });
    } else {
      callback(null);
    }
  }
}

export function createOptimizedStorage(
  options: OptimizedStorageOptions,
): OptimizedDiskStorage {
  return new OptimizedDiskStorage(options);
}
