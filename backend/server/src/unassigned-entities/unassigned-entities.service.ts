import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UnassignedEntitiesService {
    constructor(private readonly prisma: PrismaService) { }



    async getprocessesWithoutTasks() {
        return this.prisma.process.findMany({
            where: {
                task_task_task_process_idToprocess: {
                    none: {},
                },
            },
        });
    }

    async getTaskWithoutProcesses() {
        return this.prisma.task.findMany({
            where: {
                process_task_task_process_idToprocess: null, // <-- singular relation, check for null
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
        });
    }

    async getJobsWithoutTable() {
        return this.prisma.job.findMany({
            where: {
                table_job: {
                    none: {}, // <-- filters jobs with zero table_job entries
                },
            },
        });
    }

}



