/* eslint-disable @typescript-eslint/no-explicit-any */
import config from '../../config/index.js';

const isAbsoluteUrl = (str: string): boolean => {
  return str.startsWith('http://') || str.startsWith('https://');
};

/**
 * Prefix filename(s) with public CDN or backend uploads base URL.
 */
export const wrapFilename = (
  filename: string | string[] | undefined | null,
  basePrefix?: string,
): string | string[] | undefined | null => {
  if (!filename) return filename;

  const defaultBase =
    basePrefix ||
    config.url?.uploads ||
    `${config.frontendUrl.replace(/\/$/, '')}/uploads`;

  if (Array.isArray(filename)) {
    return filename.map((name) => {
      if (!name || isAbsoluteUrl(name)) return name;
      const cleanName = name.replace(/^\/+/, '');
      return `${defaultBase}/${cleanName}`;
    });
  }

  if (isAbsoluteUrl(filename)) return filename;
  const cleanName = filename.replace(/^\/+/, '');
  return `${defaultBase}/${cleanName}`;
};

/**
 * Unwrap full URL back to just the filename (useful before saving to DB).
 */
export const unwrapFilename = (
  url: string | string[] | undefined | null,
): string | string[] | undefined | null => {
  if (!url) return url;

  if (Array.isArray(url)) {
    return url.map((item) => {
      if (!item || !isAbsoluteUrl(item)) return item;
      const parts = item.split('/');
      return parts[parts.length - 1] || item;
    });
  }

  if (!isAbsoluteUrl(url)) return url;
  const parts = url.split('/');
  return parts[parts.length - 1] || url;
};

/**
 * Recursively walk an object or array and automatically transform matched image keys
 * using wrapFilename (e.g. ['thumbnail', 'images', 'avatar']).
 */
export const walkAndTransform = (
  input: any,
  keys: string | string[],
  basePrefix?: string,
): any => {
  if (!input) return input;

  const keySet = new Set(Array.isArray(keys) ? keys : [keys]);

  const handle = (value: any): any => {
    if (Array.isArray(value)) {
      return value.map(handle);
    }

    if (value && typeof value === 'object' && Object.keys(value).length > 0) {
      const result: Record<string, any> = {};

      for (const k in value) {
        if (keySet.has(k)) {
          result[k] = wrapFilename(value[k], basePrefix);
        } else {
          result[k] = handle(value[k]);
        }
      }

      return result;
    }

    return value;
  };

  return handle(input);
};
