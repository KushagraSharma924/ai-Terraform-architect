import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const frontendUrl = config.get<string>('app.frontendUrl') ?? 'http://localhost:3003';

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  const port = config.get<number>('app.port') ?? 3000;
  await app.listen(port);
  console.log(`🚀 ata-gateway running on http://localhost:${port}`);
}

bootstrap();
