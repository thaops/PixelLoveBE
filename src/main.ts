import * as crypto from 'crypto';

// Polyfill for Node.js 18 to support @nestjs/schedule
if (typeof global.crypto === 'undefined') {
  (global as any).crypto = {
    randomUUID: crypto.randomUUID,
  };
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';


/**
 * Bootstrap function
 * Initializes and starts the NestJS application
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  });

  // Global validation pipe for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties exist
      transform: true, // Automatically transform payloads to DTO instances
    }),
  );

  // Global logging interceptor for all API requests
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Pixel Love API')
    .setDescription('API documentation for Pixel Love Backend')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('User', 'User profile management')
    .addTag('Couple', 'Couple pairing and love date')
    .addTag('Pet', 'Pet status and feeding')
    .addTag('Album', 'Photo album management')
    .addTag('Home', 'Virtual home scene')
    .addTag('Cloudinary', 'Cloudinary upload utilities')
    .addServer('http://localhost:3000', 'Local development server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Keep JWT token after page refresh
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Pixel Love Backend is running on: http://0.0.0.0:${port}/api`);
  console.log(`📚 Swagger documentation: http://0.0.0.0:${port}/api/docs`);
  console.log(`🔌 WebSocket server: ws://0.0.0.0:${port}/events`);
}

bootstrap();
