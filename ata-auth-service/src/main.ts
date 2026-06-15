import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe (class-validator)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,         // strip unknown properties
      forbidNonWhitelisted: true,
      transform: true,         // auto-transform payloads to DTO instances
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS
  const config = app.get(ConfigService);
  const frontendUrl = config.get<string>('app.frontendUrl') ?? 'http://localhost:3003';
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000'],
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 ata-auth-service running on http://localhost:${port}`);
}

bootstrap();
