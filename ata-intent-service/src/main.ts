import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL, 'http://localhost:3000'] : ['http://localhost:3003', 'http://localhost:3000'],
    credentials: true,
  });
  
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT ?? 3004;
  await app.listen(port);
  console.log(`Intent service is running on: http://localhost:${port}`);
}
bootstrap();

