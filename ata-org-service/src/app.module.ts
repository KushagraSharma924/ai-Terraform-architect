import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import configuration from './config/configuration';
import { envSchema } from './config/validation.schema';
import { DatabaseModule } from './database/database.module';
import { OrgModule } from './modules/org/org.module';
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
    DatabaseModule,
    OrgModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
