import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bullmq';
import configuration from './config/configuration';
import { envSchema } from './config/validation.schema';
import { DatabaseModule } from './database/database.module';
import { DeploymentModule } from './modules/deployment/deployment.module';
import { AppController } from './app.controller';

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
    DeploymentModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
