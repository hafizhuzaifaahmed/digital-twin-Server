import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFunctionDto } from './dto/create-function.dto';
import { UpdateFunctionDto } from './dto/update-function.dto';

@Injectable()
export class FunctionService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateFunctionDto) {
    const data: any = {
      functionCode: dto.functionCode,
      name: dto.name,
      company: { connect: { company_id: dto.company_id } },
      Function: dto.parent_function_id
        ? { connect: { function_id: dto.parent_function_id } }
        : undefined,
      backgroundColor: dto.backgroundColor ?? undefined,
      overview: dto.overview,
      job: dto.job_ids && dto.job_ids.length
        ? { connect: dto.job_ids.map((job_id) => ({ job_id })) }
        : undefined,
    };
    return (this.prisma as any).function.create({
      data,
      include: {
        company: true,
        Function: true,
        other_Function: true,
        job: true,
      },
    });
  }

  async findAll() {
    return (this.prisma as any).function.findMany({
      include: {
        company: true,
        Function: true,
        other_Function: true,
        job: true,
      },
    });
  }

  async findOne(function_id: number) {
    const func = await (this.prisma as any).function.findUnique({ where: { function_id } });
    if (!func) throw new NotFoundException(`Function ${function_id} not found`);
    return func;
  }

  async findAllWithRelations() {
    return (this.prisma as any).function.findMany({
      include: {
        company: true,
        Function: true,
        other_Function: true,
        job: {
          include: {
            job_level: true,
            jobSkills: { include: { skill: true } },
            jobTasks: { include: { task: true } },
          },
        },
      },
    });
  }

  async findOneWithRelations(function_id: number) {
    const func = await (this.prisma as any).function.findUnique({
      where: { function_id },
      include: {
        company: true,
        Function: true,
        other_Function: true,
        job: {
          include: {
            job_level: true,
            jobSkills: { include: { skill: true } },
            jobTasks: { include: { task: true } },
          },
        },
      },
    });
    if (!func) throw new NotFoundException(`Function ${function_id} not found`);
    return func;
  }

  async update(function_id: number, dto: UpdateFunctionDto) {
    const data: any = {
      functionCode: dto.functionCode ?? undefined,
      name: dto.name ?? undefined,
      company: dto.company_id ? { connect: { company_id: dto.company_id } } : undefined,
      Function: dto.parent_function_id
        ? { connect: { function_id: dto.parent_function_id } }
        : dto.parent_function_id === null
          ? { disconnect: true }
          : undefined,
      backgroundColor: dto.backgroundColor ?? undefined,
      overview: dto.overview ?? undefined,
      job: Array.isArray(dto.job_ids)
        ? { set: dto.job_ids.map((job_id) => ({ job_id })) }
        : undefined,
    };
    try {
      return await (this.prisma as any).function.update({
        where: { function_id },
        data,
        include: {
          company: true,
          Function: true,
          other_Function: true,
          job: true,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException(`Function ${function_id} not found`);
      throw e;
    }
  }

  async remove(function_id: number) {
    try {
      return await (this.prisma as any).function.delete({ where: { function_id } });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException(`Function ${function_id} not found`);
      throw e;
    }
  }

  async countFunctions() {
    return await (this.prisma as any).function.count();
  }
}
