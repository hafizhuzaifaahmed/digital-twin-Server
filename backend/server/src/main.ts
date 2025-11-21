import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { SeedService } from './auth/seed.service';

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

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
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
