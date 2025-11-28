import { BadRequestException, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

@Injectable()
export class JobService {
  constructor(private readonly prisma: PrismaService) {}

  // Map LevelName enum (as uppercased strings) to numeric rank
  private readonly levelRankMap: Record<string, number> = {
    NOVICE: 1,
    INTERMEDIATE: 2,
    PROFICIENT: 3,
    ADVANCED: 4,
    EXPERT: 5,
  };

  async create(dto: CreateJobDto) {
    // Validate company exists
    const company = await this.prisma.company.findUnique({
      where: { company_id: dto.company_id },
    });
    if (!company) {
      throw new BadRequestException(`Company with ID ${dto.company_id} does not exist`);
    }

    // Validate function exists
    const func = await (this.prisma as any).function.findUnique({
      where: { function_id: dto.function_id },
    });
    if (!func) {
      throw new BadRequestException(`Function with ID ${dto.function_id} does not exist`);
    }

    // Validate all task IDs exist if provided
    if (dto.task_ids && dto.task_ids.length > 0) {
      const existingTasks = await this.prisma.task.findMany({
        where: { task_id: { in: dto.task_ids } },
        select: { task_id: true },
      });
      if (existingTasks.length !== dto.task_ids.length) {
        const existingIds = existingTasks.map(t => t.task_id);
        const missingIds = dto.task_ids.filter(id => !existingIds.includes(id));
        throw new BadRequestException(`Tasks with IDs [${missingIds.join(', ')}] do not exist`);
      }
    }

    // Check for duplicate job code
    const existingJob = await this.prisma.job.findFirst({
      where: { jobCode: dto.jobCode },
    });
    if (existingJob) {
      throw new ConflictException(`A job with code '${dto.jobCode}' already exists`);
    }

    return this.prisma.executeWithRetry(async (client) => {
      return client.$transaction(async (tx) => {
      // Resolve job level by level_name (create if missing)
      const level = dto.jobLevel?.toUpperCase();
      if (!level) throw new BadRequestException('jobLevel is required');
      let jl = await tx.job_level.findFirst({ where: { level_name: level as any } });
      if (!jl) {
        jl = await tx.job_level.create({ data: { level_name: level as any, level_rank: this.levelRankMap[level] } });
      }

      const job = await tx.job.create({
        data: {
          jobCode: dto.jobCode,
          name: dto.name,
          description: dto.description,
          overview: dto.overview,
          hourlyRate: dto.hourlyRate,
          maxHoursPerDay: dto.maxHoursPerDay,
          company_id: dto.company_id,
          function_id: dto.function_id,
          job_level_id: jl.id,
          updatedAt: new Date(),
          jobTasks: dto.task_ids?.length
            ? {
                create: dto.task_ids.map((task_id) => ({ task: { connect: { task_id } } })),
              }
            : undefined,
        },
        include: ({
          company: true,
          Function: true,
          job_level: true,
          jobTasks: { include: { task: true } },
          jobSkills: { include: { skill: true, skill_level: true } },
        } as any),
      });

      // Handle skills: upsert by name and connect with level
      if (dto.skills?.length) {
        for (const s of dto.skills) {
          const skillName = s.name.trim();
          const levelName = s.level.toUpperCase();
          let skill = await tx.skill.findUnique({ where: { name: skillName } });
          if (!skill) {
            skill = await tx.skill.create({ data: { name: skillName } });
          }
          let sl = await tx.skill_level.findFirst({ where: { level_name: levelName as any } });
          if (!sl) {
            sl = await tx.skill_level.create({ data: { level_name: levelName as any, level_rank: this.levelRankMap[levelName] } });
          }
          await tx.job_skill.upsert({
            where: { job_id_skill_id: { job_id: job.job_id, skill_id: skill.skill_id } },
            update: { skill_level_id: sl.id },
            create: { job_id: job.job_id, skill_id: skill.skill_id, skill_level_id: sl.id },
          });
        }
      }

      return tx.job.findUnique({
        where: { job_id: job.job_id },
        include: ({
          company: true,
          Function: true,
          job_level: true,
          jobTasks: { include: { task: true } },
          jobSkills: { include: { skill: true, skill_level: true } },
        } as any),
      });
      });
    });
  }

  async findAll() {
    return this.prisma.job.findMany();
  }

  async findOne(job_id: number) {
    const job = await this.prisma.job.findUnique({ where: { job_id } });
    if (!job) throw new NotFoundException(`Job ${job_id} not found`);
    return job;
  }

  async findAllWithRelations() {
    return this.prisma.job.findMany({
      include: ({
        company: true,
        Function: true,
        job_level: true,
        jobSkills: { include: { skill: true, skill_level: true } },
        jobTasks: { include: { task: true } },
      } as any),
    });
  }

  async findOneWithRelations(job_id: number) {
    const job = await this.prisma.job.findUnique({
      where: { job_id },
      include: ({
        company: true,
        Function: true,
        job_level: true,
        jobSkills: { include: { skill: true, skill_level: true } },
        jobTasks: { include: { task: true } },
      } as any),
    });
    if (!job) throw new NotFoundException(`Job ${job_id} not found`);
    return job;
  }

  async update(job_id: number, dto: UpdateJobDto) {
    return this.prisma.executeWithRetry(async (client) => {
      return client.$transaction(async (tx) => {
      // Check if job exists and get current updatedAt for concurrency guard
      const existingJob = await tx.job.findUnique({ 
        where: { job_id },
        select: { job_id: true, updatedAt: true }
      });
      if (!existingJob) throw new NotFoundException(`Job ${job_id} not found`);

      // Optimistic concurrency guard (if provided)
      if (dto.if_match_updated_at) {
        const clientTs = new Date(dto.if_match_updated_at).toISOString();
        const serverTs = new Date(existingJob.updatedAt as any).toISOString();
        if (clientTs !== serverTs) {
          throw new ConflictException('Job has been modified by another process');
        }
      }

      // Resolve job level if provided
      let job_level_id: number | undefined = undefined;
      if (dto.jobLevel) {
        const level = dto.jobLevel.toUpperCase();
        let jl = await tx.job_level.findFirst({ where: { level_name: level as any } });
        if (!jl) jl = await tx.job_level.create({ data: { level_name: level as any, level_rank: this.levelRankMap[level] } });
        job_level_id = jl.id;
      }

      const data: any = {
        jobCode: dto.jobCode ?? undefined,
        name: dto.name ?? undefined,
        description: dto.description ?? undefined,
        overview: dto.overview ?? undefined,
        hourlyRate: dto.hourlyRate ?? undefined,
        maxHoursPerDay: dto.maxHoursPerDay ?? undefined,
        company_id: dto.company_id ?? undefined,
        function_id: dto.function_id ?? undefined,
        job_level_id,
      };

      const updated = await tx.job.update({ where: { job_id }, data });

      if (dto.task_ids) {
        await (tx as any).job_task.deleteMany({ where: { job_id } });
        if (dto.task_ids.length) {
          const uniqueTaskIds = Array.from(new Set(dto.task_ids));
          await (tx as any).job_task.createMany({ data: uniqueTaskIds.map((task_id: number) => ({ job_id, task_id })) });
        }
      }

      if (dto.skills) {
        await (tx as any).job_skill.deleteMany({ where: { job_id } });
        if (dto.skills.length) {
          for (const s of dto.skills) {
            const skillName = s.name.trim();
            const levelName = s.level.toUpperCase();
            let skill = await tx.skill.findUnique({ where: { name: skillName } });
            if (!skill) skill = await tx.skill.create({ data: { name: skillName } });
            let sl = await tx.skill_level.findFirst({ where: { level_name: levelName as any } });
            if (!sl) sl = await tx.skill_level.create({ data: { level_name: levelName as any, level_rank: this.levelRankMap[levelName] } });
            await (tx as any).job_skill.create({ data: { job_id, skill_id: skill.skill_id, skill_level_id: sl.id } });
          }
        }
      }

      return tx.job.findUnique({
        where: { job_id },
        include: ({
          company: true,
          Function: true,
          job_level: true,
          jobSkills: { include: { skill: true, skill_level: true } },
          jobTasks: { include: { task: true } },
        } as any),
      });
      });
    });
  }

  async remove(job_id: number) {
    return this.prisma.executeWithRetry(async (client) => {
      return client.$transaction(async (tx) => {
      // 1. First check if job exists
      const job = await tx.job.findUnique({
        where: { job_id },
        include: {
          people: true,
          jobTasks: true,
          jobSkills: true,
          table_job: true,
        },
      });

      if (!job) {
        throw new NotFoundException(`Job with ID ${job_id} not found`);
      }

      // 2. Check if there are people assigned to this job
      if (job.people && job.people.length > 0) {
        throw new BadRequestException(
          `Cannot delete job ${job_id} because it has ${job.people.length} people assigned to it. ` +
          'Please reassign or remove these people before deleting the job.'
        );
      }

      // 3. Delete related records in the correct order
      //    (child tables first, then parent job record)
      
      // Delete job_skill relations
      if (job.jobSkills && job.jobSkills.length > 0) {
        await tx.job_skill.deleteMany({
          where: { job_id }
        });
      }

      // Delete job_task relations
      if (job.jobTasks && job.jobTasks.length > 0) {
        await tx.job_task.deleteMany({
          where: { job_id }
        });
      }

      // Delete table_job relations
      if (job.table_job && job.table_job.length > 0) {
        await tx.table_job.deleteMany({
          where: { job_id }
        });
      }

      // Finally, delete the job
      return tx.job.delete({
        where: { job_id },
        include: {
          company: true,
          Function: true,
          job_level: true,
        },
      });
      });
    });
  }

  // Connect/Disconnect methods for skills
  async connectSkill(job_id: number, skill_id: number, skill_level_id: number) {
    // Ensure job exists
    await this.findOne(job_id);
    return (this.prisma as any).job_skill.create({
      data: { job_id, skill_id, skill_level_id },
      include: ({ skill: true, skill_level: true } as any),
    });
  }

  async disconnectSkill(job_id: number, skill_id: number) {
    return this.prisma.job_skill.delete({
      where: { 
        job_id_skill_id: { 
          job_id, 
          skill_id 
        } 
      }
    });
  }

  // Connect/Disconnect methods for tasks
  async connectTask(job_id: number, task_id: number) {
    return this.prisma.job_task.create({
      data: {
        job: { connect: { job_id } },
        task: { connect: { task_id } }
      },
      include: { 
        task: true 
      },
    });
  }

  async disconnectTask(job_id: number, task_id: number) {
    return this.prisma.job_task.delete({
      where: { 
        job_id_task_id: { 
          job_id, 
          task_id 
        } 
      },
      include: { task: true }
    });
  }
}
