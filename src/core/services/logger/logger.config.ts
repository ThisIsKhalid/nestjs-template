import config from '../../../config/index.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Options } from 'pino-http';

const isVerbose = config.logVerbose;

export const pinoHttpConfig: Options = {
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: isVerbose
            ? {
                colorize: true,
                singleLine: false,
                translateTime: 'SYS:HH:MM:ss',
              }
            : {
                colorize: true,
                singleLine: true,
                translateTime: 'SYS:HH:MM:ss',
                ignore: 'pid,hostname,req,res,responseTime',
              },
        }
      : undefined,
  customSuccessMessage: isVerbose
    ? undefined
    : (req: IncomingMessage, res: ServerResponse, responseTime: number) => {
        return `${req.method} ${req.url} -> ${res.statusCode} (${responseTime}ms)`;
      },
  customErrorMessage: (
    req: IncomingMessage,
    res: ServerResponse,
    error: Error,
  ) => {
    return `${req.method} ${req.url} -> ${res.statusCode}: ${error.message}`;
  },
  redact: ['req.headers.authorization', 'req.headers.cookie'],
  autoLogging: isVerbose
    ? true
    : {
        ignore: (req: IncomingMessage) => req.url === '/health/live',
      },
  serializers: isVerbose
    ? undefined
    : {
        req: (req: IncomingMessage & { id?: string | number }) => ({
          id: req.id,
          method: req.method,
          url: req.url,
        }),
        res: (res: ServerResponse) => ({
          statusCode: res.statusCode,
        }),
      },
};
