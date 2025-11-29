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
      user_id: dto.user_id ?? null,
    };
    try {
      return await this.prisma.users_3d.create({ data });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        // Unique constraint failed
        throw new BadRequestException('Email already exists or user_id already linked');
      }
      if (e?.code === 'P2003') {
        // Foreign key constraint failed
        throw new BadRequestException('Invalid company_id, created_by, or user_id');
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
        linkedUser: {
          select: {
            user_id: true,
            name: true,
            email: true,
            role: true,
            company_id: true,
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
        linkedUser: {
          select: {
            user_id: true,
            name: true,
            email: true,
            role: true,
            company_id: true,
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
        linkedUser: {
          select: {
            user_id: true,
            name: true,
            email: true,
            role: true,
            company_id: true,
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
    };
    // Handle user_id: allow setting to null to unlink, or set to a new value
    if (dto.user_id !== undefined) {
      data.user_id = dto.user_id;
    }
    try {
      return await this.prisma.users_3d.update({ where: { id }, data });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException(`3D User ${id} not found`);
      if (e?.code === 'P2002') throw new BadRequestException('Email already exists or user_id already linked');
      if (e?.code === 'P2003') throw new BadRequestException('Invalid company_id or user_id');
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

  /**
   * Get accessible companies for a 3D user based on their linked user's role:
   * - If linked to SUPER_ADMIN: returns all companies
   * - If linked to USER: returns linked user's company
   * - If not linked: returns only the 3D user's own company
   */
  async getAccessibleCompanies(user3dId: number) {
    const user3d = await this.prisma.users_3d.findUnique({
      where: { id: user3dId },
      include: {
        company: true,
        linkedUser: {
          include: {
            role: true,
            company: true,
          },
        },
      },
    });

    if (!user3d) throw new NotFoundException(`3D User ${user3dId} not found`);

    // If linked to a user, check their role
    if (user3d.linkedUser) {
      const linkedUserRole = user3d.linkedUser.role?.name;

      // SUPER_ADMIN sees all companies
      if (linkedUserRole === 'SUPER_ADMIN') {
        return this.prisma.company.findMany({
          orderBy: { name: 'asc' },
        });
      }

      // USER sees their linked user's company
      if (user3d.linkedUser.company_id) {
        const linkedCompany = await this.prisma.company.findUnique({
          where: { company_id: user3d.linkedUser.company_id },
        });
        return linkedCompany ? [linkedCompany] : [];
      }
    }

    // Not linked or linked user has no company: return only 3D user's own company
    return user3d.company ? [user3d.company] : [];
  }
}
