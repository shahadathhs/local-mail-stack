import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ENVEnum } from './common/enum/env.enum';
import { AllExceptionsFilter } from './core/filter/http-exception.filter';

import { NestExpressApplication } from '@nestjs/platform-express';
import hbs from 'hbs';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const configService = app.get(ConfigService);

  // * Configure View Engine (Handlebars)
  app.useStaticAssets(join(__dirname, '..', '..', 'public')); // If we had public assets
  app.setBaseViewsDir(join(__dirname, '..', '..', 'views'));
  app.setViewEngine('hbs');

  // Register HBS helpers
  hbs.registerHelper('slice', (str: string, start: number, end: number) => {
    return str ? str.slice(start, end) : '';
  });

  // * enable cors
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:5173',
      'http://localhost:5174',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // * add global pipes
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // * add global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // * Swagger config with Bearer Auth
  const config = new DocumentBuilder()
    .setTitle('Local Mail Stack API')
    .setDescription('Local Mail Server (SMTP + IMAP) for Development & Testing')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // * set port
  const port = parseInt(configService.get<string>(ENVEnum.PORT) ?? '3000', 10);
  await app.listen(port);
}
bootstrap();
