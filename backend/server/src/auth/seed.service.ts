import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async seedSuperAdmin() {
    // Ensure SUPER_ADMIN role exists
    let role = await this.prisma.role.findFirst({ where: { name: 'SUPER_ADMIN' } });
    if (!role) {
      role = await this.prisma.role.create({ 
        data: { 
          name: 'SUPER_ADMIN'
        } 
      });
      this.logger.log('Created SUPER_ADMIN role');
    }

    const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@example.com';
    const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'ChangeMe123!';

    const existing = await this.prisma.user.findFirst({ where: { email } });
    if (!existing) {
      const hashed = await bcrypt.hash(password, 10);
      
      await this.prisma.user.create({
        data: {
          email,
          name,
          password: hashed,
          role_id: role.role_id,
        },
      });
      this.logger.log(`Seeded SUPER_ADMIN user (${email}).`);
    }
  }
}
