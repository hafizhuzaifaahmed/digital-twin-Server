import { Module } from '@nestjs/common';
import { Users3dController } from './users-3d.controller';
import { Users3dService } from './users-3d.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [Users3dController],
  providers: [Users3dService],
  exports: [Users3dService],
})
export class Users3dModule {}
