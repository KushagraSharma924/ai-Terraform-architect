import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bullmq';
import { APP_FILTER } from '@nestjs/core';
import configuration from './config/configuration';
import { envSchema } from './config/validation.schema';
import { DatabaseModule } from './database/database.module';
import { GenerationsModule } from './modules/generations/generations.module';
import { PipelineModule } from './modules/pipeline/pipeline.module';
import { QueueModule } from './modules/queue/queue.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: (config) => {
        const parsed = envSchema.safeParse(config);
        if (!parsed.success) {
          throw new Error(`Configuration validation error:\n${parsed.error.toString()}`);
        }
        return parsed.data;
      },
    }),
    JwtModule.registerAsync({
      global: true,
      useFactory: (config: ConfigService) => ({
        publicKey: config.get<string>('app.jwtPublicKey'),
        verifyOptions: { algorithms: ['RS256'] },
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('app.redisUrl') ?? 'redis://localhost:6379',
          maxRetriesPerRequest: 1,
        },
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    GenerationsModule,
    PipelineModule,
    QueueModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
