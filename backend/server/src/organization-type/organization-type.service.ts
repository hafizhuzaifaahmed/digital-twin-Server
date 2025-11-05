import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationTypeDto } from './dto/create-organization-type.dto';
import { UpdateOrganizationTypeDto } from './dto/update-organization-type.dto';

@Injectable()
export class OrganizationTypeService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateOrganizationTypeDto) {
    try {
      return await this.prisma.organizationType.create({
        data: {
          name: dto.name,
          description: dto.description,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('Organization type with this name already exists');
      }
      throw e;
    }
  }

  async findAll() {
    return this.prisma.organizationType.findMany({
      include: {
        _count: {
          select: { companies: true },
        },
      },
    });
  }

  async findOne(id: number) {
    const orgType = await this.prisma.organizationType.findUnique({
      where: { id },
      include: {
        _count: {
          select: { companies: true },
        },
      },
    });
    if (!orgType) {
      throw new NotFoundException(`Organization type with ID ${id} not found`);
    }
    return orgType;
  }

  async update(id: number, dto: UpdateOrganizationTypeDto) {
    try {
      return await this.prisma.organizationType.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2025') {
        throw new NotFoundException(`Organization type with ID ${id} not found`);
      }
      if (e?.code === 'P2002') {
        throw new ConflictException('Organization type with this name already exists');
      }
      throw e;
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.organizationType.delete({ where: { id } });
    } catch (e: any) {
      if (e?.code === 'P2025') {
        throw new NotFoundException(`Organization type with ID ${id} not found`);
      }
      throw e;
    }
  }
}
