import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async seedSuperAdmin() {
    try {
      this.logger.log('Starting SUPER_ADMIN seeding process...');
      
      // Test database connection first
      await this.prisma.$queryRaw`SELECT 1`;
      this.logger.log('Database connection verified');

      // Ensure SUPER_ADMIN role exists
      this.logger.log('Checking for SUPER_ADMIN role...');
      let role = await this.prisma.role.findFirst({ where: { name: 'SUPER_ADMIN' } });
      
      if (!role) {
        this.logger.log('Creating SUPER_ADMIN role...');
        role = await this.prisma.role.create({ 
          data: { 
            name: 'SUPER_ADMIN'
          } 
        });
        this.logger.log('Created SUPER_ADMIN role');
      } else {
        this.logger.log('SUPER_ADMIN role already exists');
      }

      const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@example.com';
      const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';
      const password = process.env.SUPER_ADMIN_PASSWORD || 'ChangeMe123!';

      this.logger.log(`Checking for existing user with email: ${email}`);
      const existing = await this.prisma.user.findFirst({ where: { email } });
      
      if (!existing) {
        this.logger.log('Creating SUPER_ADMIN user...');
        const hashed = await bcrypt.hash(password, 10);
        
        await this.prisma.user.create({
          data: {
            email,
            name,
            password: hashed,
            role_id: role.role_id,
          },
        });
        this.logger.log(`Successfully seeded SUPER_ADMIN user (${email})`);
      } else {
        this.logger.log(`SUPER_ADMIN user already exists (${email})`);
      }
      
      this.logger.log('SUPER_ADMIN seeding process completed successfully');
    } catch (error) {
      this.logger.error('Error during SUPER_ADMIN seeding:', error.message);
      this.logger.error('Stack trace:', error.stack);
      throw error;
    }
  }
}
