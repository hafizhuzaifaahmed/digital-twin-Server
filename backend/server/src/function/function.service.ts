import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFunctionDto } from './dto/create-function.dto';
import { UpdateFunctionDto } from './dto/update-function.dto';

@Injectable()
export class FunctionService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateFunctionDto) {
    // Validate company exists
    const company = await this.prisma.company.findUnique({
      where: { company_id: dto.company_id },
    });
    if (!company) {
      throw new BadRequestException(`Company with ID ${dto.company_id} does not exist`);
    }

    // Validate parent function exists if provided
    if (dto.parent_function_id) {
      const parentFunction = await (this.prisma as any).function.findUnique({
        where: { function_id: dto.parent_function_id },
      });
      if (!parentFunction) {
        throw new BadRequestException(`Parent function with ID ${dto.parent_function_id} does not exist`);
      }
    }

    // Validate all job IDs exist if provided
    if (dto.job_ids && dto.job_ids.length > 0) {
      const existingJobs = await this.prisma.job.findMany({
        where: { job_id: { in: dto.job_ids } },
        select: { job_id: true },
      });
      if (existingJobs.length !== dto.job_ids.length) {
        const existingIds = existingJobs.map(j => j.job_id);
        const missingIds = dto.job_ids.filter(id => !existingIds.includes(id));
        throw new BadRequestException(`Jobs with IDs [${missingIds.join(', ')}] do not exist`);
      }
    }

    try {
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
      return await (this.prisma as any).function.create({
        data,
        include: {
          company: true,
          Function: true,
          other_Function: true,
          job: true,
        },
      });
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          throw new ConflictException(`A function with code '${dto.functionCode}' already exists`);
        }
      }
      throw e;
    }
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
    // Validate function exists
    const existingFunction = await (this.prisma as any).function.findUnique({
      where: { function_id },
    });
    if (!existingFunction) {
      throw new NotFoundException(`Function with ID ${function_id} not found`);
    }

    // Validate company exists if changing
    if (dto.company_id) {
      const company = await this.prisma.company.findUnique({
        where: { company_id: dto.company_id },
      });
      if (!company) {
        throw new BadRequestException(`Company with ID ${dto.company_id} does not exist`);
      }
    }

    // Validate parent function exists if provided
    if (dto.parent_function_id) {
      if (dto.parent_function_id === function_id) {
        throw new BadRequestException('A function cannot be its own parent');
      }
      const parentFunction = await (this.prisma as any).function.findUnique({
        where: { function_id: dto.parent_function_id },
      });
      if (!parentFunction) {
        throw new BadRequestException(`Parent function with ID ${dto.parent_function_id} does not exist`);
      }
    }

    // Validate all job IDs exist if provided
    if (dto.job_ids && dto.job_ids.length > 0) {
      const existingJobs = await this.prisma.job.findMany({
        where: { job_id: { in: dto.job_ids } },
        select: { job_id: true },
      });
      if (existingJobs.length !== dto.job_ids.length) {
        const existingIds = existingJobs.map(j => j.job_id);
        const missingIds = dto.job_ids.filter(id => !existingIds.includes(id));
        throw new BadRequestException(`Jobs with IDs [${missingIds.join(', ')}] do not exist`);
      }
    }

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
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          throw new ConflictException(`A function with code '${dto.functionCode}' already exists`);
        }
        if (e.code === 'P2025') {
          throw new NotFoundException(`Function ${function_id} not found`);
        }
      }
      throw e;
    }
  }

  async remove(function_id: number) {
    // Check if function exists
    const existingFunction = await (this.prisma as any).function.findUnique({
      where: { function_id },
      include: {
        other_Function: true,
        job: true,
      },
    });

    if (!existingFunction) {
      throw new NotFoundException(`Function with ID ${function_id} not found`);
    }

    // Check if this function has child functions
    if (existingFunction.other_Function && existingFunction.other_Function.length > 0) {
      throw new BadRequestException(
        `Cannot delete function ${function_id} because it has ${existingFunction.other_Function.length} child function(s). ` +
        'Please delete or reassign child functions first.'
      );
    }

    // Check if this function has jobs assigned
    if (existingFunction.job && existingFunction.job.length > 0) {
      throw new BadRequestException(
        `Cannot delete function ${function_id} because it has ${existingFunction.job.length} job(s) assigned. ` +
        'Please reassign or delete the jobs first.'
      );
    }

    try {
      return await (this.prisma as any).function.delete({ where: { function_id } });
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new NotFoundException(`Function ${function_id} not found`);
        }
      }
      throw e;
    }
  }

  async countFunctions() {
    return await (this.prisma as any).function.count();
  }
}
