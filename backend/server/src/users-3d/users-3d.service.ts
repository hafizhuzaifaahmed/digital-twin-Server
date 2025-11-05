import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUser3dDto } from './dto/create-user-3d.dto';
import { UpdateUser3dDto } from './dto/update-user-3d.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class Users3dService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUser3dDto) {
    const hashed = dto.password ? await bcrypt.hash(dto.password, 10) : undefined;
    const data: any = {
      name: dto.name,
      email: dto.email,
      company_id: dto.company_id,
      password: hashed ?? undefined,
      created_by: dto.created_by,
    };
    try {
      return await this.prisma.users_3d.create({ data });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        // Unique constraint failed
        throw new BadRequestException('Email already exists');
      }
      if (e?.code === 'P2003') {
        // Foreign key constraint failed
        throw new BadRequestException('Invalid company_id or created_by');
      }
      throw e;
    }
  }

  async findAll() {
    return this.prisma.users_3d.findMany({
      include: {
        company: true,
        creator: {
          select: {
            user_id: true,
            name: true,
            email: true,
          },
        },
        updater: {
          select: {
            user_id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const user3d = await this.prisma.users_3d.findUnique({
      where: { id },
      include: {
        company: true,
        creator: {
          select: {
            user_id: true,
            name: true,
            email: true,
          },
        },
        updater: {
          select: {
            user_id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    if (!user3d) throw new NotFoundException(`3D User ${id} not found`);
    return user3d;
  }

  async findByCompany(company_id: number) {
    return this.prisma.users_3d.findMany({
      where: { company_id },
      include: {
        company: true,
        creator: {
          select: {
            user_id: true,
            name: true,
            email: true,
          },
        },
        updater: {
          select: {
            user_id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async update(id: number, dto: UpdateUser3dDto) {
    const hashed = dto.password ? await bcrypt.hash(dto.password, 10) : undefined;
    const data: any = {
      name: dto.name ?? undefined,
      email: dto.email ?? undefined,
      company_id: dto.company_id ?? undefined,
      password: hashed ?? undefined,
      updated_by: dto.updated_by,
    };
    try {
      return await this.prisma.users_3d.update({ where: { id }, data });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException(`3D User ${id} not found`);
      if (e?.code === 'P2002') throw new BadRequestException('Email already exists');
      if (e?.code === 'P2003') throw new BadRequestException('Invalid company_id or updated_by');
      throw e;
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.users_3d.delete({ where: { id } });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException(`3D User ${id} not found`);
      throw e;
    }
  }
}
