import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DRIZZLE_TOKEN } from './drizzle.decorator';
import * as schema from './schema';

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_TOKEN,
      useFactory: async (config: ConfigService) => {
        const databaseUrl = config.get<string>('app.database.url')!;
        const pool = new Pool({ connectionString: databaseUrl });
        return drizzle(pool, { schema });
      },
      inject: [ConfigService],
    },
  ],
  exports: [DRIZZLE_TOKEN],
})
export class DatabaseModule {}
