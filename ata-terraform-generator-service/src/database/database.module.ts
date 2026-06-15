import { Module, Global, Inject, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DRIZZLE_TOKEN } from './drizzle.decorator';
import * as schema from './schema';

@Global()
@Module({
  providers: [
    {
      provide: 'DATABASE_POOL',
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('app.databaseUrl')!;
        return new Pool({ connectionString: databaseUrl });
      },
      inject: [ConfigService],
    },
    {
      provide: DRIZZLE_TOKEN,
      useFactory: (pool: Pool) => {
        return drizzle(pool, { schema });
      },
      inject: ['DATABASE_POOL'],
    },
  ],
  exports: [DRIZZLE_TOKEN],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject('DATABASE_POOL') private readonly pool: Pool) {}

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
