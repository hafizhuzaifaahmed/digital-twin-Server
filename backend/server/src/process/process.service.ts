import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProcessDto } from './dto/create-process.dto';
import { UpdateProcessDto } from './dto/update-process.dto';

@Injectable()
export class ProcessService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProcessDto: CreateProcessDto) {
    const { 
      process_name, 
      process_code, 
      company_id, 
      process_overview, 
      parent_process_id, 
      parent_task_id, 
      workflow 
    } = createProcessDto;

    return this.prisma.executeWithRetry(async (client) => {
      return client.$transaction(async (prisma) => {
        // Create the process
        const process = await prisma.process.create({
          data: {
            process_name,
            process_code,
            company_id,
            process_overview,
            parent_process_id,
            parent_task_id,
          },
        });

        // If workflow is provided, create process_task entries
        if (workflow && workflow.length > 0) {
          // Validate that all tasks exist
          const taskIds = workflow.map((w) => w.task_id);
          const existingTasks = await prisma.task.findMany({
            where: { task_id: { in: taskIds } },
            select: { task_id: true, task_capacity_minutes: true },
          });

          if (existingTasks.length !== taskIds.length) {
            const missingIds = taskIds.filter((id) => !existingTasks.some((t) => t.task_id === id));
            throw new NotFoundException(`Tasks not found: ${missingIds.join(', ')}`);
          }

          // Validate that all jobs exist
          const jobIds = workflow.map((w) => w.job_id);
          const uniqueJobIds = [...new Set(jobIds)]; // Deduplicate job IDs
          const existingJobs = await prisma.job.findMany({
            where: { job_id: { in: uniqueJobIds } },
            select: { job_id: true },
          });

          if (existingJobs.length !== uniqueJobIds.length) {
            const missingJobIds = uniqueJobIds.filter((id) => !existingJobs.some((j) => j.job_id === id));
            throw new NotFoundException(`Jobs not found: ${missingJobIds.join(', ')}`);
          }

          // Create process_task entries
          await prisma.process_task.createMany({
            data: workflow.map((w) => ({
              process_id: process.process_id,
              task_id: w.task_id,
              order: w.order,
            })),
          });

          // Create or update job_task relationships
          for (const workflowItem of workflow) {
            await prisma.job_task.upsert({
              where: {
                job_id_task_id: {
                  job_id: workflowItem.job_id,
                  task_id: workflowItem.task_id,
                },
              },
              update: {}, // No update needed if exists
              create: {
                job_id: workflowItem.job_id,
                task_id: workflowItem.task_id,
              },
            });
          }

          // Calculate and update capacity_requirement_minutes
          const totalCapacity = existingTasks.reduce((sum, task) => sum + task.task_capacity_minutes, 0);
          await prisma.process.update({
            where: { process_id: process.process_id },
            data: { capacity_requirement_minutes: totalCapacity },
          });
        }

        // Return the created process with relations
        return prisma.process.findUnique({
          where: { process_id: process.process_id },
          include: {
            company: true,
            process: true,
            task_process_parent_task_idTotask: true,
            process_task: {
              include: {
                task: {
                  include: {
                    jobTasks: {
                      include: {
                        job: true,
                      },
                    },
                  },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
        });
      });
    });
  }

  async findAll() {
    return this.prisma.process.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async findAllWithRelations() {
    return this.prisma.process.findMany({
      include: {
        company: true,
        process: true,
        task_process_parent_task_idTotask: true,
        process_task: {
          include: {
            task: {
              include: {
                jobTasks: {
                  include: {
                    job: true,
                  },
                },
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(process_id: number) {
    const process = await this.prisma.process.findUnique({
      where: { process_id },
    });

    if (!process) {
      throw new NotFoundException(`Process with ID ${process_id} not found`);
    }

    return process;
  }

  async findOneWithRelations(process_id: number) {
    const process = await this.prisma.process.findUnique({
      where: { process_id },
      include: {
        company: true,
        process: true,
        task_process_parent_task_idTotask: true,
        process_task: {
          include: {
            task: {
              include: {
                jobTasks: {
                  include: {
                    job: true,
                  },
                },
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!process) {
      throw new NotFoundException(`Process with ID ${process_id} not found`);
    }

    return process;
  }

  async update(process_id: number, updateProcessDto: UpdateProcessDto) {
    const {
      process_name,
      process_code,
      company_id,
      process_overview,
      parent_process_id,
      parent_task_id,
      workflow,
    } = updateProcessDto;

    return this.prisma.executeWithRetry(async (client) => {
      return client.$transaction(async (prisma) => {
        // Check if process exists and get current updated_at for concurrency guard
        const existingProcess = await prisma.process.findUnique({
          where: { process_id },
          select: { process_id: true, updated_at: true },
        });

        if (!existingProcess) {
          throw new NotFoundException(`Process with ID ${process_id} not found`);
        }

        // Optimistic concurrency guard (if provided)
        if (updateProcessDto.if_match_updated_at) {
          const clientTs = new Date(updateProcessDto.if_match_updated_at).toISOString();
          const serverTs = new Date(existingProcess.updated_at as any).toISOString();
          if (clientTs !== serverTs) {
            throw new ConflictException('Process has been modified by another process');
          }
        }

        // Update the process basic fields
        await prisma.process.update({
          where: { process_id },
          data: {
            ...(process_name && { process_name }),
            ...(process_code && { process_code }),
            ...(company_id && { company_id }),
            ...(process_overview && { process_overview }),
            ...(parent_process_id !== undefined && { parent_process_id }),
            ...(parent_task_id !== undefined && { parent_task_id }),
          },
        });

        // If workflow is provided, replace existing process_task entries
        if (workflow !== undefined) {
          // Delete existing process_task entries
          await prisma.process_task.deleteMany({
            where: { process_id },
          });

          if (workflow.length > 0) {
            // Validate that all tasks exist
            const taskIds = workflow.map((w) => w.task_id);
            const existingTasks = await prisma.task.findMany({
              where: { task_id: { in: taskIds } },
              select: { task_id: true, task_capacity_minutes: true },
            });

            if (existingTasks.length !== taskIds.length) {
              const missingIds = taskIds.filter((id) => !existingTasks.some((t) => t.task_id === id));
              throw new NotFoundException(`Tasks not found: ${missingIds.join(', ')}`);
            }

            // Validate that all jobs exist
            const jobIds = workflow.map((w) => w.job_id);
            const uniqueJobIds = [...new Set(jobIds)]; // Deduplicate job IDs
            const existingJobs = await prisma.job.findMany({
              where: { job_id: { in: uniqueJobIds } },
              select: { job_id: true },
            });

            if (existingJobs.length !== uniqueJobIds.length) {
              const missingJobIds = uniqueJobIds.filter((id) => !existingJobs.some((j) => j.job_id === id));
              throw new NotFoundException(`Jobs not found: ${missingJobIds.join(', ')}`);
            }

            // Create new process_task entries
            await prisma.process_task.createMany({
              data: workflow.map((w) => ({
                process_id,
                task_id: w.task_id,
                order: w.order,
              })),
            });

            // Create or update job_task relationships
            for (const workflowItem of workflow) {
              await prisma.job_task.upsert({
                where: {
                  job_id_task_id: {
                    job_id: workflowItem.job_id,
                    task_id: workflowItem.task_id,
                  },
                },
                update: {}, // No update needed if exists
                create: {
                  job_id: workflowItem.job_id,
                  task_id: workflowItem.task_id,
                },
              });
            }

            // Calculate and update capacity_requirement_minutes
            const totalCapacity = existingTasks.reduce((sum, task) => sum + task.task_capacity_minutes, 0);
            await prisma.process.update({
              where: { process_id },
              data: { capacity_requirement_minutes: totalCapacity },
            });
          } else {
            // No tasks in workflow, set capacity to null
            await prisma.process.update({
              where: { process_id },
              data: { capacity_requirement_minutes: null },
            });
          }
        }

        // Return the updated process with relations
        return prisma.process.findUnique({
          where: { process_id },
          include: {
            company: true,
            process: true,
            task_process_parent_task_idTotask: true,
            process_task: {
              include: {
                task: {
                  include: {
                    jobTasks: {
                      include: {
                        job: true,
                      },
                    },
                  },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
        });
      });
    });
  }

  async remove(process_id: number) {
    return this.prisma.executeWithRetry(async (client) => {
      try {
        return await client.process.delete({ where: { process_id } });
      } catch (e: any) {
        if (e?.code === 'P2025') throw new NotFoundException(`Process ${process_id} not found`);
        throw e;
      }
    });
  }

  // Helper method to recalculate capacity for a process
  private async recalculateCapacity(process_id: number) {
    const processTasks = await this.prisma.process_task.findMany({
      where: { process_id },
      include: { task: { select: { task_capacity_minutes: true } } },
    });

    const totalCapacity = processTasks.reduce(
      (sum, pt) => sum + pt.task.task_capacity_minutes, 
      0
    );

    await this.prisma.process.update({
      where: { process_id },
      data: { 
        capacity_requirement_minutes: processTasks.length > 0 ? totalCapacity : null 
      },
    });

    return totalCapacity;
  }

  // Connect/Disconnect methods for tasks (legacy support)
  async connectTask(process_id: number, task_id: number) {
    // Verify process exists
    const process = await this.prisma.process.findUnique({
      where: { process_id },
    });
    if (!process) {
      throw new NotFoundException(`Process ${process_id} not found`);
    }

    // Verify task exists
    const task = await this.prisma.task.findUnique({
      where: { task_id },
    });
    if (!task) {
      throw new NotFoundException(`Task ${task_id} not found`);
    }

    // Check if connection already exists
    const existingConnection = await this.prisma.process_task.findUnique({
      where: { 
        process_id_task_id: { process_id, task_id } 
      },
    });
    if (existingConnection) {
      throw new Error(`Task ${task_id} is already connected to process ${process_id}`);
    }

    // Get the next order number
    const maxOrder = await this.prisma.process_task.findFirst({
      where: { process_id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = (maxOrder?.order || 0) + 1;

    // Create the connection
    await this.prisma.process_task.create({
      data: {
        process_id,
        task_id,
        order: nextOrder,
      },
    });

    // Recalculate capacity
    await this.recalculateCapacity(process_id);

    // Return updated task with process relation
    return this.prisma.task.findUnique({
      where: { task_id },
      include: {
        process_task: {
          include: { process: true },
        },
      },
    });
  }

  async disconnectTask(process_id: number, task_id: number) {
    // Verify the connection exists
    const connection = await this.prisma.process_task.findUnique({
      where: { 
        process_id_task_id: { process_id, task_id } 
      },
    });

    if (!connection) {
      throw new NotFoundException(`Task ${task_id} is not connected to process ${process_id}`);
    }

    // Remove the connection
    await this.prisma.process_task.delete({
      where: { 
        process_id_task_id: { process_id, task_id } 
      },
    });

    // Recalculate capacity
    await this.recalculateCapacity(process_id);

    return { message: `Task ${task_id} disconnected from process ${process_id}` };
  }
}
