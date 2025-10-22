import { Injectable } from '@nestjs/common';
import { OnModuleInit, INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      log: ['warn', 'error'],
      // Transaction timeout configuration
      transactionOptions: {
        maxWait: 10000, // 10 seconds max wait for transaction to start
        timeout: 30000, // 30 seconds transaction timeout
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  // Helper method for retrying transactions on timeout
  async executeWithRetry<T>(
    operation: (prisma: PrismaService) => Promise<T>,
    maxRetries: number = 6,
    delay: number = 100
  ): Promise<T> {
    const isRetryable = (err: any) => {
      const code = err?.code;
      // P2028: Transaction API error/timeout
      // P2034: Transaction failed due to a write conflict/deadlock/serialization (retryable)
      return code === 'P2028' || code === 'P2034';
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation(this);
      } catch (error: any) {
        if (attempt < maxRetries && isRetryable(error)) {
          // Exponential backoff with jitter
          const base = delay * Math.pow(2, attempt - 1); // 100, 200, 400, 800, ...
          const jitter = Math.floor(Math.random() * base * 0.2); // up to 20% jitter
          const sleepMs = base + jitter;
          await new Promise((resolve) => setTimeout(resolve, sleepMs));
          continue;
        }
        throw error;
      }
    }
    throw new Error('Max retries exceeded');
  }

  async enableShutdownHooks(app: INestApplication) {
    // Use a loose cast so this compiles even before `prisma generate` runs
    (this as any).$on('beforeExit', async () => {
      await app.close();
    });
  }
}
