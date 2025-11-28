import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProcessDto } from './dto/create-process.dto';
import { UpdateProcessDto } from './dto/update-process.dto';

@Injectable()
export class ProcessService {
  constructor(private readonly prisma: PrismaService) { }

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

    // Validate company exists
    const company = await this.prisma.company.findUnique({
      where: { company_id },
    });
    if (!company) {
      throw new BadRequestException(`Company with ID ${company_id} does not exist`);
    }

    // Validate parent process exists if provided
    if (parent_process_id) {
      const parentProcess = await this.prisma.process.findUnique({
        where: { process_id: parent_process_id },
      });
      if (!parentProcess) {
        throw new BadRequestException(`Parent process with ID ${parent_process_id} does not exist`);
      }
    }

    // Validate parent task exists if provided
    if (parent_task_id) {
      const parentTask = await this.prisma.task.findUnique({
        where: { task_id: parent_task_id },
      });
      if (!parentTask) {
        throw new BadRequestException(`Parent task with ID ${parent_task_id} does not exist`);
      }
    }

    // Check for duplicate process code
    const existingProcess = await this.prisma.process.findFirst({
      where: { process_code },
    });
    if (existingProcess) {
      throw new ConflictException(`A process with code '${process_code}' already exists`);
    }

    return this.prisma.executeWithRetry(async (client) => {
      return client.$transaction(async (prisma) => {

        // 🚨 Step 1: Check if parent_process_id is invalid (cyclic)
        if (parent_process_id) {
          // Check if parent belongs to same company
          const parentProcess = await prisma.process.findUnique({
            where: { process_id: parent_process_id },
            select: { company_id: true }
          });

          if (!parentProcess) {
            throw new NotFoundException("Parent process not found.");
          }

          if (parentProcess.company_id !== company_id) {
            throw new BadRequestException("Parent process belongs to a different company.");
          }

          // 🚨 Check no cycle can happen
          const invalid = await this.isCircularParent(prisma, parent_process_id, company_id);
          if (invalid) {
            throw new BadRequestException(
              "Invalid parent: A process cannot be parent of its ancestor."
            );
          }
        }

        // Step 2: Create process
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

        // Step 3: (your existing workflow code stays unchanged)
        if (workflow && workflow.length > 0) {
          // Filter workflow items that have task_id (not child_process_id)
          const taskWorkflowItems = workflow.filter((w): w is typeof w & { task_id: number } => w.task_id !== undefined);
          const taskIds = taskWorkflowItems.map((w) => w.task_id);

          let existingTasks: { task_id: number; task_capacity_minutes: number }[] = [];
          if (taskIds.length > 0) {
            existingTasks = await prisma.task.findMany({
              where: { task_id: { in: taskIds } },
              select: { task_id: true, task_capacity_minutes: true },
            });

            if (existingTasks.length !== taskIds.length) {
              const missingIds = taskIds.filter((id) => !existingTasks.some((t) => t.task_id === id));
              throw new NotFoundException(`Tasks not found: ${missingIds.join(', ')}`);
            }
          }

          const jobIds = taskWorkflowItems.map((w) => w.job_id);
          const uniqueJobIds = [...new Set(jobIds)];
          if (uniqueJobIds.length > 0) {
            const existingJobs = await prisma.job.findMany({
              where: { job_id: { in: uniqueJobIds } },
              select: { job_id: true },
            });

            if (existingJobs.length !== uniqueJobIds.length) {
              const missingJobIds = uniqueJobIds.filter((id) => !existingJobs.some((j) => j.job_id === id));
              throw new NotFoundException(`Jobs not found: ${missingJobIds.join(', ')}`);
            }
          }

          await prisma.process_task.createMany({
            data: workflow.map((w) => ({
              process_id: process.process_id,
              task_id: w.task_id,
              child_process_id: w.child_process_id,
              order: w.order,
            })),
          });

          for (const workflowItem of taskWorkflowItems) {
            await prisma.job_task.upsert({
              where: {
                job_id_task_id: {
                  job_id: workflowItem.job_id,
                  task_id: workflowItem.task_id,
                },
              },
              update: {},
              create: {
                job_id: workflowItem.job_id,
                task_id: workflowItem.task_id,
              },
            });
          }

          const totalCapacity = existingTasks.reduce((sum, task) => sum + task.task_capacity_minutes, 0);
          await prisma.process.update({
            where: { process_id: process.process_id },
            data: { capacity_requirement_minutes: totalCapacity },
          });
        }

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

        // 🚨 Validate parent_process_id to prevent self-referencing and circular hierarchy
        if (parent_process_id !== undefined && parent_process_id !== null) {
          // A process cannot be its own parent
          if (parent_process_id === process_id) {
            throw new BadRequestException("A process cannot be its own parent.");
          }

          // Check if parent exists
          const parentProcess = await prisma.process.findUnique({
            where: { process_id: parent_process_id },
            select: { company_id: true }
          });

          if (!parentProcess) {
            throw new NotFoundException("Parent process not found.");
          }

          // Get the company_id of the current process for validation
          const currentProcess = await prisma.process.findUnique({
            where: { process_id },
            select: { company_id: true }
          });

          const effectiveCompanyId = company_id || currentProcess?.company_id;

          if (parentProcess.company_id !== effectiveCompanyId) {
            throw new BadRequestException("Parent process belongs to a different company.");
          }

          // 🚨 Check for circular hierarchy - ensure the new parent is not a descendant of this process
          const wouldCreateCycle = await this.wouldCreateCycle(prisma, process_id, parent_process_id);
          if (wouldCreateCycle) {
            throw new BadRequestException(
              "Invalid parent: Setting this parent would create a circular hierarchy."
            );
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
            // Filter workflow items that have task_id (not child_process_id)
            const taskWorkflowItems = workflow.filter((w): w is typeof w & { task_id: number } => w.task_id !== undefined);
            const taskIds = taskWorkflowItems.map((w) => w.task_id);

            let existingTasks: { task_id: number; task_capacity_minutes: number }[] = [];
            if (taskIds.length > 0) {
              // Validate that all tasks exist
              existingTasks = await prisma.task.findMany({
                where: { task_id: { in: taskIds } },
                select: { task_id: true, task_capacity_minutes: true },
              });

              if (existingTasks.length !== taskIds.length) {
                const missingIds = taskIds.filter((id) => !existingTasks.some((t) => t.task_id === id));
                throw new NotFoundException(`Tasks not found: ${missingIds.join(', ')}`);
              }
            }

            // Validate that all jobs exist
            const jobIds = taskWorkflowItems.map((w) => w.job_id);
            const uniqueJobIds = [...new Set(jobIds)]; // Deduplicate job IDs
            if (uniqueJobIds.length > 0) {
              const existingJobs = await prisma.job.findMany({
                where: { job_id: { in: uniqueJobIds } },
                select: { job_id: true },
              });

              if (existingJobs.length !== uniqueJobIds.length) {
                const missingJobIds = uniqueJobIds.filter((id) => !existingJobs.some((j) => j.job_id === id));
                throw new NotFoundException(`Jobs not found: ${missingJobIds.join(', ')}`);
              }
            }

            // Create new process_task entries
            await prisma.process_task.createMany({
              data: workflow.map((w) => ({
                process_id,
                task_id: w.task_id,
                child_process_id: w.child_process_id,
                order: w.order,
              })),
            });

            // Create or update job_task relationships
            for (const workflowItem of taskWorkflowItems) {
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
      where: { process_id, task_id: { not: null } },
      include: { task: { select: { task_capacity_minutes: true } } },
    });

    const totalCapacity = processTasks.reduce(
      (sum, pt) => sum + (pt.task?.task_capacity_minutes || 0),
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
    const existingConnection = await this.prisma.process_task.findFirst({
      where: {
        process_id,
        task_id
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
    const connection = await this.prisma.process_task.findFirst({
      where: {
        process_id,
        task_id
      },
    });

    if (!connection) {
      throw new NotFoundException(`Task ${task_id} is not connected to process ${process_id}`);
    }

    // Remove the connection
    await this.prisma.process_task.delete({
      where: {
        process_task_id: connection.process_task_id
      },
    });

    // Recalculate capacity
    await this.recalculateCapacity(process_id);

    return { message: `Task ${task_id} disconnected from process ${process_id}` };
  }


  async processswithCompany(company_id: number) {
    const company = await this.prisma.company.findUnique({
      where: { company_id },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${company_id} not found`);
    }

    return this.prisma.process.findMany({
      where: {
        company_id: company_id,
      },
      include: {
        company: true,
      },
    });
  }

  /**
   * Check if setting a parent would create a circular reference (for create operation)
   * This walks up the parent chain from the proposed parent to ensure no cycles exist
   */
  private async isCircularParent(prisma: any, newParentId: number, companyId: number): Promise<boolean> {
    // Walk upward from the new parent until root
    let current = await prisma.process.findUnique({
      where: { process_id: newParentId },
      select: { parent_process_id: true, company_id: true }
    });

    // Safety: parent must belong to same company
    if (current && current.company_id !== companyId) {
      throw new BadRequestException("Parent process belongs to a different company.");
    }

    const visited = new Set<number>();
    visited.add(newParentId);

    while (current?.parent_process_id) {
      if (visited.has(current.parent_process_id)) {
        // Found a cycle in existing hierarchy
        return true;
      }
      visited.add(current.parent_process_id);

      current = await prisma.process.findUnique({
        where: { process_id: current.parent_process_id },
        select: { parent_process_id: true }
      });
    }

    return false;
  }

  /**
   * Check if setting newParentId as parent of processId would create a cycle (for update operation)
   * This ensures the new parent is not a descendant of the process being updated
   */
  private async wouldCreateCycle(prisma: any, processId: number, newParentId: number): Promise<boolean> {
    // Walk up the ancestor chain starting from the new parent
    // If we encounter processId, it means newParentId is a descendant of processId
    // and setting it as parent would create a cycle

    const visited = new Set<number>();
    let currentId: number | null = newParentId;

    while (currentId !== null) {
      // If we've reached the process we're updating, there would be a cycle
      if (currentId === processId) {
        return true;
      }

      // Prevent infinite loops in case of existing data corruption
      if (visited.has(currentId)) {
        break;
      }
      visited.add(currentId);

      const current = await prisma.process.findUnique({
        where: { process_id: currentId },
        select: { parent_process_id: true }
      });

      currentId = current?.parent_process_id ?? null;
    }

    return false;
  }
}
