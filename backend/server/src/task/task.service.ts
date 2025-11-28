import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

// Define the type for Task with all relations
export type TaskWithRelations = Prisma.taskGetPayload<{
  include: {
    company: true;
    process_task_task_process_idToprocess: true;
    process_task: {
      include: {
        process: true;
      };
    };
    jobTasks: {
      include: {
        job: true;
      };
    };
    task_skill: {
      include: {
        skill: true;
        skill_level: true;
      };
    };
  };
}>;

@Injectable()
export class TaskService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createTaskDto: CreateTaskDto): Promise<TaskWithRelations> {
    // Validate company exists
    const company = await this.prisma.company.findUnique({
      where: { company_id: createTaskDto.task_company_id },
    });
    if (!company) {
      throw new BadRequestException(`Company with ID ${createTaskDto.task_company_id} does not exist`);
    }

    // Validate process exists if provided
    if (createTaskDto.task_process_id) {
      const process = await this.prisma.process.findUnique({
        where: { process_id: createTaskDto.task_process_id },
      });
      if (!process) {
        throw new BadRequestException(`Process with ID ${createTaskDto.task_process_id} does not exist`);
      }
    }

    // Check for duplicate task code
    const existingTask = await this.prisma.task.findFirst({
      where: { task_code: createTaskDto.task_code },
    });
    if (existingTask) {
      throw new ConflictException(`A task with code '${createTaskDto.task_code}' already exists`);
    }

    return this.prisma.executeWithRetry(async (prisma) => {
      return prisma.$transaction(async (tx) => {
        try {
          // Create the task first
          const task = await tx.task.create({
            data: {
              task_name: createTaskDto.task_name,
              task_code: createTaskDto.task_code,
              task_company_id: createTaskDto.task_company_id,
              task_capacity_minutes: createTaskDto.task_capacity_minutes,
              task_process_id: createTaskDto.task_process_id,
              task_overview: createTaskDto.task_overview,
            },
          });

          // Process taskSkills if provided - batch and shorten transaction
          if (createTaskDto.taskSkills && createTaskDto.taskSkills.length > 0) {
            const skillsInput = createTaskDto.taskSkills;
            const skillNames = Array.from(new Set(skillsInput.map((s) => s.skill_name.trim())));

            // Create or find skills with better error handling
            const skillMap = new Map<string, number>();

            for (const skillName of skillNames) {
              try {
                // Try to find existing skill first
                let skill = await tx.skill.findUnique({ where: { name: skillName } });

                // If not found, create it
                if (!skill) {
                  skill = await tx.skill.create({
                    data: { name: skillName }
                  });
                }

                skillMap.set(skillName, skill.skill_id);
              } catch (error) {
                // If creation failed due to unique constraint, try to find it again
                if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                  const existingSkill = await tx.skill.findUnique({ where: { name: skillName } });
                  if (existingSkill) {
                    skillMap.set(skillName, existingSkill.skill_id);
                  } else {
                    throw new NotFoundException(`Failed to create or find skill: ${skillName}`);
                  }
                } else {
                  throw error;
                }
              }
            }

            // Verify all skills were processed
            if (skillMap.size !== skillNames.length) {
              const missing = skillNames.filter(name => !skillMap.has(name));
              throw new NotFoundException(`Skills not processed: ${missing.join(', ')}`);
            }

            // Fetch required skill levels in one query
            const levelNames = Array.from(new Set(skillsInput.map((s) => s.level)));
            const levels = await tx.skill_level.findMany({ where: { level_name: { in: levelNames as any } } });
            if (levels.length !== levelNames.length) {
              const missing = levelNames.filter((ln) => !levels.some((l) => l.level_name === (ln as any)));
              throw new NotFoundException(`Skill levels not found: ${missing.join(', ')}`);
            }
            const levelMap = new Map(levels.map((l) => [l.level_name, l.id] as const));

            // Build createMany payload with validation
            const taskSkillRows = skillsInput.map((s) => {
              const skillName = s.skill_name.trim();
              const skillId = skillMap.get(skillName);
              const levelId = levelMap.get(s.level as any);

              if (!skillId) {
                throw new NotFoundException(`Skill '${skillName}' not found after creation attempt`);
              }
              if (!levelId) {
                throw new NotFoundException(`Skill level '${s.level}' not found`);
              }

              return {
                task_skill_task_id: task.task_id,
                task_skill_skill_id: skillId,
                task_skill_level_id: levelId,
                skill_name: skillName,
              };
            });

            await tx.task_skill.createMany({ data: taskSkillRows, skipDuplicates: true });
          }

          // Process job linking if provided - verify in bulk and createMany
          if (createTaskDto.job_ids && createTaskDto.job_ids.length > 0) {
            const jobIds = Array.from(new Set(createTaskDto.job_ids));
            const existingJobs = await tx.job.findMany({ where: { job_id: { in: jobIds } }, select: { job_id: true } });
            if (existingJobs.length !== jobIds.length) {
              const missing = jobIds.filter((id) => !existingJobs.some((j) => j.job_id === id));
              throw new NotFoundException(`Jobs not found: ${missing.join(', ')}`);
            }
            await tx.job_task.createMany({
              data: jobIds.map((job_id) => ({ job_id, task_id: task.task_id })),
              skipDuplicates: true,
            });
          }

          // Return the created task with all relations
          const createdTask = await tx.task.findUnique({
            where: { task_id: task.task_id },
            include: {
              company: true,
              process_task_task_process_idToprocess: true,
              process_task: {
                include: {
                  process: true,
                },
              },
              jobTasks: {
                include: {
                  job: true,
                },
              },
              task_skill: {
                include: {
                  skill: true,
                  skill_level: true,
                },
              },
            },
          });

          if (!createdTask) {
            throw new NotFoundException('Failed to retrieve created task');
          }

          return createdTask;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
              const target = error.meta?.target as string[];
              if (target?.includes('task_task_code_key')) {
                throw new ConflictException(`Task with code '${createTaskDto.task_code}' already exists`);
              }
            }
          }
          throw error;
        }
      });
    });
  }

  async findAllBasic(): Promise<any[]> {
    return this.prisma.task.findMany();
  }

  async findAll(): Promise<TaskWithRelations[]> {
    return this.prisma.task.findMany({
      include: {
        company: true,
        process_task_task_process_idToprocess: true,
        process_task: {
          include: {
            process: true,
          },
        },
        jobTasks: {
          include: {
            job: true,
          },
        },
        task_skill: {
          include: {
            skill: true,
            skill_level: true,
          },
        },
      },
    });
  }

  async findOneBasic(id: number): Promise<any | null> {
    const task = await this.prisma.task.findUnique({
      where: { task_id: id },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async findOne(id: number): Promise<TaskWithRelations> {
    const task = await this.prisma.task.findUnique({
      where: { task_id: id },
      include: {
        company: true,
        process_task_task_process_idToprocess: true,
        process_task: {
          include: {
            process: true,
          },
        },
        jobTasks: {
          include: {
            job: true,
          },
        },
        task_skill: {
          include: {
            skill: true,
            skill_level: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async update(id: number, updateTaskDto: UpdateTaskDto): Promise<TaskWithRelations> {
    return this.prisma.executeWithRetry(async (prisma) => {
      return prisma.$transaction(async (tx) => {
        try {
          // Check if task exists
          const existingTask = await tx.task.findUnique({
            where: { task_id: id },
            select: { task_id: true, updated_at: true },
          });

          if (!existingTask) {
            throw new NotFoundException(`Task with ID ${id} not found`);
          }

          // Optimistic concurrency guard (if provided)
          if (updateTaskDto.if_match_updated_at) {
            const clientTs = new Date(updateTaskDto.if_match_updated_at).toISOString();
            const serverTs = new Date(existingTask.updated_at as any).toISOString();
            if (clientTs !== serverTs) {
              throw new ConflictException('Task has been modified by another process');
            }
          }

          // Update task fields if provided
          const updateData: any = {};
          if (updateTaskDto.task_name !== undefined) updateData.task_name = updateTaskDto.task_name;
          if (updateTaskDto.task_code !== undefined) updateData.task_code = updateTaskDto.task_code;
          if (updateTaskDto.task_company_id !== undefined) updateData.task_company_id = updateTaskDto.task_company_id;
          if (updateTaskDto.task_capacity_minutes !== undefined) updateData.task_capacity_minutes = updateTaskDto.task_capacity_minutes;
          if (updateTaskDto.task_process_id !== undefined) updateData.task_process_id = updateTaskDto.task_process_id;
          if (updateTaskDto.task_overview !== undefined) updateData.task_overview = updateTaskDto.task_overview;

          if (Object.keys(updateData).length > 0) {
            await tx.task.update({
              where: { task_id: id },
              data: updateData,
            });
          }

          // Replace taskSkills atomically if provided
          if (updateTaskDto.taskSkills !== undefined) {
            // Delete existing task_skill rows for this task
            await tx.task_skill.deleteMany({ where: { task_skill_task_id: id } });

            if (updateTaskDto.taskSkills.length > 0) {
              const skillsInput = updateTaskDto.taskSkills;
              const skillNames = Array.from(new Set(skillsInput.map((s) => s.skill_name.trim())));

              await tx.skill.createMany({ data: skillNames.map((name) => ({ name })), skipDuplicates: true });
              const skills = await tx.skill.findMany({ where: { name: { in: skillNames } } });
              const skillMap = new Map(skills.map((s) => [s.name, s.skill_id] as const));

              const levelNames = Array.from(new Set(skillsInput.map((s) => s.level)));
              const levels = await tx.skill_level.findMany({ where: { level_name: { in: levelNames as any } } });
              if (levels.length !== levelNames.length) {
                const missing = levelNames.filter((ln) => !levels.some((l) => l.level_name === (ln as any)));
                throw new NotFoundException(`Skill levels not found: ${missing.join(', ')}`);
              }
              const levelMap = new Map(levels.map((l) => [l.level_name, l.id] as const));

              const taskSkillRows = skillsInput.map((s) => ({
                task_skill_task_id: id,
                task_skill_skill_id: skillMap.get(s.skill_name.trim())!,
                task_skill_level_id: levelMap.get(s.level as any)!,
                skill_name: s.skill_name.trim(),
              }));
              await tx.task_skill.createMany({ data: taskSkillRows, skipDuplicates: true });
            }
          }

          // Replace job links atomically if provided
          if (updateTaskDto.job_ids !== undefined) {
            // Delete existing job_task rows for this task
            await tx.job_task.deleteMany({ where: { task_id: id } });

            if (updateTaskDto.job_ids.length > 0) {
              const jobIds = Array.from(new Set(updateTaskDto.job_ids));
              const existingJobs = await tx.job.findMany({ where: { job_id: { in: jobIds } }, select: { job_id: true } });
              if (existingJobs.length !== jobIds.length) {
                const missing = jobIds.filter((jid) => !existingJobs.some((j) => j.job_id === jid));
                throw new NotFoundException(`Jobs not found: ${missing.join(', ')}`);
              }
              await tx.job_task.createMany({ data: jobIds.map((job_id) => ({ job_id, task_id: id })) });
            }
          }

          // Return the updated task with all relations
          const updatedTask = await tx.task.findUnique({
            where: { task_id: id },
            include: {
              company: true,
              process_task_task_process_idToprocess: true,
              process_task: {
                include: {
                  process: true,
                },
              },
              jobTasks: {
                include: {
                  job: true,
                },
              },
              task_skill: {
                include: {
                  skill: true,
                  skill_level: true,
                },
              },
            },
          });

          if (!updatedTask) {
            throw new NotFoundException(`Task with ID ${id} not found after update`);
          }

          return updatedTask;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
              const target = error.meta?.target as string[];
              if (target?.includes('task_task_code_key')) {
                throw new ConflictException(`Task with code '${updateTaskDto.task_code}' already exists`);
              }
            }
          }
          throw error;
        }
      });
    });
  }

  async remove(id: number): Promise<void> {
    return this.prisma.executeWithRetry(async (prisma) => {
      return prisma.$transaction(async (tx) => {
        // Check if task exists
        const existingTask = await tx.task.findUnique({
          where: { task_id: id },
        });

        if (!existingTask) {
          throw new NotFoundException(`Task with ID ${id} not found`);
        }

        // 1. Delete job_task relationships (CRITICAL - prevents foreign key constraint violations)
        await tx.job_task.deleteMany({
          where: { task_id: id },
        });

        // 2. Delete task_skill relationships
        await tx.task_skill.deleteMany({
          where: { task_skill_task_id: id },
        });

        // 3. Handle processes that reference this task as parent
        // Set parent_task_id to null to prevent constraint violations
        await tx.process.updateMany({
          where: { parent_task_id: id },
          data: { parent_task_id: null },
        });

        // 4. Delete process_task relationships (has cascade but safer to be explicit)
        await tx.process_task.deleteMany({
          where: { task_id: id },
        });

        // 5. Finally delete the task
        await tx.task.delete({
          where: { task_id: id },
        });
      });
    });
  }


  async taskswithCompany(company_id: number): Promise<any> {
    const company = await this.prisma.company.findUnique({
      where: { company_id },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID ${company_id} not found`);
    }

    return this.prisma.task.findMany({
      where: { task_company_id: company_id },
    });
  }
}