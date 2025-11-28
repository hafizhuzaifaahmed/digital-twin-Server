import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';
import { SeedService } from './auth/seed.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8000',
    'https://fyp-cms-frontend.vercel.app',
    'https://abdullahfahmi.itch.io',
    'https://html-classic.itch.zone',
    'https://crystalsystem-3dapp-production.up.railway.app',
    'https://crystalsytem-3dapp-test.up.railway.app',
    'https://crystalsystemcms-production.up.railway.app',
    'https://crystalsystemcms-testing-e377.up.railway.app',
    'https://crystalsystemcms-development.up.railway.app',
    'https://crystalsystemcms.up.railway.app'
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // Global exception filter - handles Prisma errors, validation errors, and HTTP exceptions
  app.useGlobalFilters(new AllExceptionsFilter());

  // Validation pipe with custom error messages
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: false, // Return all validation errors
      exceptionFactory: (errors) => {
        const messages = errors.map(error => {
          const constraints = error.constraints;
          if (constraints) {
            return Object.values(constraints).join(', ');
          }
          // Handle nested validation errors
          if (error.children && error.children.length > 0) {
            return `${error.property}: Invalid nested data`;
          }
          return `${error.property}: Invalid value`;
        });
        
        return new BadRequestException({
          statusCode: 400,
          message: messages,
          error: 'Validation Error',
        });
      },
    }),
  );

  // Seed SUPER_ADMIN role and user
  const seeder = app.get(SeedService);
  await seeder.seedSuperAdmin();

  await app.listen(process.env.PORT ?? 3001);
}

bootstrap().catch((error) => {
  console.error('Bootstrap failed:', error);
  process.exit(1);
});
