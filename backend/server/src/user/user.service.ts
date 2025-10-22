import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const hashed = dto.password ? await bcrypt.hash(dto.password, 10) : undefined;
    const data: any = {
      email: dto.email,
      name: dto.name,
      password: hashed ?? undefined,
      role_id: dto.role_id ?? undefined,
      company_id: dto.company_id ?? undefined,
    };
    try {
      return await this.prisma.user.create({ data });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        // Unique constraint failed
        throw new BadRequestException('Username or email already exists');
      }
      throw e;
    }
  }

  async findAll() {
    return this.prisma.user.findMany({ include: { role: true, company: true } });
  }

  async findOne(user_id: number) {
    const user = await this.prisma.user.findUnique({ where: { user_id }, include: { role: true, company: true } });
    if (!user) throw new NotFoundException(`User ${user_id} not found`);
    return user;
  }

  async findAllWithRelations() {
    return this.prisma.user.findMany({ include: { role: true, company: true } });
  }

  async findOneWithRelations(user_id: number) {
    const user = await this.prisma.user.findUnique({ where: { user_id }, include: { role: true, company: true } });
    if (!user) throw new NotFoundException(`User ${user_id} not found`);
    return user;
  }

  async update(user_id: number, dto: UpdateUserDto) {
    const hashed = dto.password ? await bcrypt.hash(dto.password, 10) : undefined;
    const data: any = {
      email: dto.email ?? undefined,
      name: dto.name ?? undefined,
      password: hashed ?? undefined,
      role_id: dto.role_id ?? undefined,
      company_id: dto.company_id ?? undefined,
    };
    try {
      return await this.prisma.user.update({ where: { user_id }, data });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException(`User ${user_id} not found`);
      if (e?.code === 'P2002') throw new BadRequestException('Username or email already exists');
      throw e;
    }
  }

  async remove(user_id: number) {
    try {
      return await this.prisma.user.delete({ where: { user_id } });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException(`User ${user_id} not found`);
      throw e;
    }
  }
}
