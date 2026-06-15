import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (config: ConfigService) => {
        const Redis = require('ioredis');
        const redisUrl = config.get<string>('app.redis.url') ?? 'redis://localhost:6379';
        return new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          lazyConnect: false,
        });
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: ['REDIS_CLIENT', RedisService],
})
export class RedisModule {}
