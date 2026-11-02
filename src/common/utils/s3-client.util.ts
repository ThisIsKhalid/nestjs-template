import {
  S3Client,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { config } from '../../config/index.js';

let s3ClientInstance: S3Client | null = null;

/**
 * Returns a singleton S3Client instance.
 */
export function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: config.aws.region,
      endpoint: config.aws.endpoint || undefined,
      credentials:
        config.aws.accessKeyId && config.aws.secretAccessKey
          ? {
              accessKeyId: config.aws.accessKeyId,
              secretAccessKey: config.aws.secretAccessKey,
            }
          : undefined,
    });
  }
  return s3ClientInstance;
}

/**
 * Checks whether S3 credentials and bucket are properly configured.
 */
export function isS3Configured(): boolean {
  return Boolean(
    config.aws.bucket &&
      config.aws.accessKeyId &&
      config.aws.secretAccessKey
  );
}

/**
 * Builds public URL for an S3 object key.
 * Prefers CloudFront URL if configured, otherwise standard virtual-hosted S3 URL.
 */
export function getS3Url(key: string): string {
  const cleanKey = key.replace(/^\/+/, '');
  if (config.aws.cloudFrontUrl) {
    return `${config.aws.cloudFrontUrl.replace(/\/$/, '')}/${cleanKey}`;
  }
  return `https://${config.aws.bucket}.s3.${config.aws.region}.amazonaws.com/${cleanKey}`;
}

/**
 * Deletes an object from S3 safely without throwing an unhandled exception.
 */
export async function deleteS3Object(keyOrUrl: string): Promise<boolean> {
  if (!isS3Configured()) return false;

  let key = keyOrUrl;
  if (keyOrUrl.startsWith('http://') || keyOrUrl.startsWith('https://')) {
    try {
      const parsed = new URL(keyOrUrl);
      key = parsed.pathname.replace(/^\/+/, '');
    } catch {
      key = keyOrUrl;
    }
  }

  try {
    const client = getS3Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.aws.bucket,
        Key: key,
      })
    );
    return true;
  } catch (err) {
    console.warn(`[S3] Failed to delete object "${key}":`, err instanceof Error ? err.message : err);
    return false;
  }
}

export interface ListS3ObjectsOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

export interface S3ObjectItem {
  key: string;
  url: string;
  size: number;
  lastModified?: Date;
  eTag?: string;
}

export interface ListS3ObjectsResult {
  items: S3ObjectItem[];
  nextCursor?: string;
  hasMore: boolean;
  prefix: string;
}

/**
 * Lists objects in the S3 bucket under a prefix with continuation-token pagination.
 */
export async function listS3Objects(
  options: ListS3ObjectsOptions = {},
): Promise<ListS3ObjectsResult> {
  if (!isS3Configured()) {
    return { items: [], hasMore: false, prefix: options.prefix || '' };
  }

  const client = getS3Client();
  const limit = Math.min(Math.max(options.limit ?? 24, 1), 100);
  const prefix = options.prefix ?? '';

  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: config.aws.bucket,
      Prefix: prefix,
      MaxKeys: limit,
      ContinuationToken: options.cursor || undefined,
    }),
  );

  const rawContents = response.Contents || [];
  // Exclude directory marker keys (keys that end with '/')
  const items: S3ObjectItem[] = rawContents
    .filter((obj) => obj.Key && !obj.Key.endsWith('/'))
    .map((obj) => ({
      key: obj.Key!,
      url: getS3Url(obj.Key!),
      size: obj.Size ?? 0,
      lastModified: obj.LastModified,
      eTag: obj.ETag?.replace(/"/g, ''),
    }));

  return {
    items,
    nextCursor: response.NextContinuationToken,
    hasMore: Boolean(response.IsTruncated && response.NextContinuationToken),
    prefix,
  };
}
