import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

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
  await app.listen(port);

  console.log(`🚀 Pixel Love Backend is running on: http://localhost:${port}/api`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
  console.log(`🔌 WebSocket server: ws://localhost:${port}/events`);
}

bootstrap();
