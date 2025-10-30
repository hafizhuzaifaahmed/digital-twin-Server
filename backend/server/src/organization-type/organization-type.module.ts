import { Module } from '@nestjs/common';
import { OrganizationTypeController } from './organization-type.controller';
import { OrganizationTypeService } from './organization-type.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OrganizationTypeController],
  providers: [OrganizationTypeService],
  exports: [OrganizationTypeService],
})
export class OrganizationTypeModule {}
