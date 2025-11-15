import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UnassignedEntitiesService {
    constructor(private readonly prisma: PrismaService) { }



    async getprocessesWithoutTasks() {
        return this.prisma.process.findMany({
            where: {
                process_task: {
                    none: {}, // filters processes with zero tasks
                },
            },
            select: {
                process_id: true,
                process_name: true,
                process_code: true,
                company: {
                    select: {
                        name: true,
                    },
                },
            },
        });
    }


    async getTaskWithoutProcesses() {
        return this.prisma.task.findMany({
            where: {
                process_task: {
                    none: {}, // filters tasks with zero process associations
                },
            },
            select: {
                task_id: true,
                task_name: true,
                task_code: true,
                company: {
                    select: {
                        name: true,
                    },
                },
            },
        });
    }

    async getJobsWithoutTasks() {
        return this.prisma.job.findMany({
            where: {
                jobTasks: {
                    none: {},
                },
            },
            select: {
                job_id: true,
                jobCode: true,
                name: true,
                company: {
                    select: {
                        name: true,
                    },
                },
                Function: {
                    select: {
                        name: true,
                    },
                },
            },
        });
    }

    async getJobsWithoutTable() {
        return this.prisma.job.findMany({
            where: {
                table_job: {
                    none: {},
                },
            },
            select: {
                job_id: true,
                jobCode: true,
                name: true,
                company: {
                    select: {
                        name: true,
                    },
                },
                Function: {
                    select: {
                        name: true,
                    },
                },
            },
        });
    }

    async countjobsWithoutTasks() {
        return this.prisma.job.count({
            where: {
                jobTasks: {
                    none: {},
                },
            },
        });
    }
}



