import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../../redis/redis.service';
import { ConfigService } from '@nestjs/config';

export interface RateLimitOptions {
  key: (req: Request) => string;
  limit: number;
  windowMs: number;
  errorMessage?: string;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Default: use IP-based key, configurable per route
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const routeKey = `${req.method}:${req.path}`;
    const key = `${ip}:${routeKey}`;

    const limit = this.config.get<number>('app.rateLimit.login.max') ?? 5;
    const windowMs = this.config.get<number>('app.rateLimit.login.windowMs') ?? 900000;

    this.redis
      .checkRateLimit(key, limit, windowMs)
      .then(({ allowed, remaining, resetAt }) => {
        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000));

        if (!allowed) {
          throw new HttpException(
            {
              error: 'RATE_LIMITED',
              message: 'Too many requests. Please try again later.',
              retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        next();
      })
      .catch((err: unknown) => next(err));
  }
}

/**
 * Factory to create per-route rate limit middleware with custom options.
 */
export function createRateLimitMiddleware(options: RateLimitOptions) {
  return (redis: RedisService) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = options.key(req);

      redis
        .checkRateLimit(key, options.limit, options.windowMs)
        .then(({ allowed, remaining, resetAt }) => {
          res.setHeader('X-RateLimit-Limit', options.limit);
          res.setHeader('X-RateLimit-Remaining', remaining);
          res.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000));

          if (!allowed) {
            throw new HttpException(
              {
                error: 'RATE_LIMITED',
                message: options.errorMessage ?? 'Too many requests.',
                retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
              },
              HttpStatus.TOO_MANY_REQUESTS,
            );
          }

          next();
        })
        .catch((err: unknown) => next(err));
    };
  };
}
