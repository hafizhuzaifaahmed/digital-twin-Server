import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { SeedService } from './auth/seed.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    logger.log('Creating NestJS application...');
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
      'https://crystalsystemcms-development.up.railway.app'
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

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    // Start the server first
    const port = process.env.PORT ?? 3001;
    logger.log(`Starting server on port ${port}...`);
    await app.listen(port, '0.0.0.0');
    logger.log(`Application is listening on port ${port}`);

    // Seed SUPER_ADMIN role and user after server starts
    try {
      logger.log('Running seeding process...');
      const seeder = app.get(SeedService);
      await Promise.race([
        seeder.seedSuperAdmin(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Seeding timeout')), 30000)
        )
      ]);
      logger.log('Seeding completed successfully');
    } catch (error) {
      logger.error('Seeding failed, but server is still running:', error.message);
      // Don't fail the entire application if seeding fails
    }

  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('Bootstrap failed:', error);
  process.exit(1);
});
