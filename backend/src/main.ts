import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  // check if the SSL certificate and key files exist
  const keyPath = path.join(process.cwd(), 'certs', 'key.pem');
  const certPath = path.join(process.cwd(), 'certs', 'cert.pem');
  const httpsOptions =
    fs.existsSync(keyPath) && fs.existsSync(certPath)
      ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
      : undefined;

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    httpsOptions,
  });
  //global validation pipe for request validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  //enable CORS (frontend ) running on localhost:4200
  app.enableCors({
    origin: ['https://localhost:4200', 'http://localhost:4200'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(process.env.PORT ?? 3000);
}
//start the application
void bootstrap();
