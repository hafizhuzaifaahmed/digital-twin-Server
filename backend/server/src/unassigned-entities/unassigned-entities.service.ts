import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HierarchicalViewService } from '../hierarchical-view/hierarchical-view.service';

@Injectable()
export class UnassignedEntitiesService {
    constructor(private readonly prisma: PrismaService, private readonly hierarchicalViewService: HierarchicalViewService) { }

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
                        company_id: true,
                    },
                },
            },
        });
    }

    async getprocessesWithoutTasksCreateByUsers(user_ids: number[]) {
        const processData = await this.hierarchicalViewService.getProcessDataByUserIds(user_ids);




        const processIdAssociated = processData.results?.map(result => {
            if (!result.success || !result.data) return [];
            return result.data.associatedProcesses?.map(proc => proc.process_id) || [];
        }).flat().filter(id => id !== null) as number[];

        const processIdCreated = processData.results?.map(result => {
            if (!result.success || !result.data) return [];
            return result.data.createdProcesses?.map(proc => proc.process_id) || [];
        }).flat().filter(id => id !== null) as number[];

        const associatedProcessesWithoutTasks = processIdAssociated.length > 0 ? await this.prisma.process.findMany({
            where: {
                process_id: { in: processIdAssociated },
                process_task: { none: {} }
            },
            select: {
                process_id: true,
                process_name: true,
                process_code: true,
                company: {
                    select: {
                        name: true,
                        company_id: true,
                    },
                },
            },
        }) : [];
        const createdProcessesWithoutTasks = processIdCreated.length > 0 ? await this.prisma.process.findMany({
            where: {
                process_id: { in: processIdCreated },
                process_task: { none: {} }
            },
            select: {
                process_id: true,
                process_name: true,
                process_code: true,
                company: {
                    select: {
                        name: true,
                        company_id: true,
                    },
                },
            },
        }) : [];
        return {
            associatedProcessesWithoutTasks: associatedProcessesWithoutTasks,
            createdProcessesWithoutTasks: createdProcessesWithoutTasks
        };


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
                        company_id: true,
                    },
                },
            },
        });
    }

    async getTaskWithoutProcessesByUsers(user_ids: number[]) {
        const userTaskData = await this.hierarchicalViewService.getTaskDataByUserIds(user_ids);

        const taskIdAssociated = userTaskData.results?.map(result => {
            if (!result.success || !result.data) return [];
            return result.data.associatedTasks?.map(task => task.task_id) || [];
        }).flat().filter(id => id !== null) as number[];

        const taskIdCreated = userTaskData.results?.map(result => {
            if (!result.success || !result.data) return [];
            return result.data.createdTasks?.map(task => task.task_id) || [];
        }).flat().filter(id => id !== null) as number[];

        const associatedTasksWithoutProcesses = taskIdAssociated.length > 0 ? await this.prisma.task.findMany({
            where: {
                task_id: { in: taskIdAssociated },
                process_task: { none: {} }
            },
            select: {
                task_id: true,
                task_name: true,
                task_code: true,
                company: {
                    select: {
                        name: true,
                        company_id: true,
                    },
                },
            },
        }) : [];

        const createdTasksWithoutProcesses = taskIdCreated.length > 0 ? await this.prisma.task.findMany({
            where: {
                task_id: { in: taskIdCreated },
                process_task: { none: {} }
            },
            select: {
                task_id: true,
                task_name: true,
                task_code: true,
                company: {
                    select: {
                        name: true,
                        company_id: true,
                    },
                },
            },
        }) : [];

        return {
            associatedTasksWithoutProcesses: associatedTasksWithoutProcesses,
            createdTasksWithoutProcesses: createdTasksWithoutProcesses
        };
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
                        company_id: true,
                    },
                },
                Function: {
                    select: {
                        name: true,
                        function_id: true,
                    },
                },
            },
        });
    }

    async getJobsWithoutTasksCreateByUsers(user_ids: number[]) {
        const jobData = await this.hierarchicalViewService.getJobDataByUserIds(user_ids);
        const jobIdForAssoicated = jobData.results?.map(result => {
            if (!result.success || !result.data) return null;
            return result.data.associatedJobs?.map(job => job.job_id) || [];
        }).flat().filter(id => id !== null) as number[];

        const jobIdForCreated = jobData.results?.map(result => {
            if (!result.success || !result.data) return null;
            return result.data.createdJobs?.map(job => job.job_id) || [];
        }).flat().filter(id => id !== null) as number[];

        const assoicatedTaskWitoutTasks = jobIdForAssoicated.length > 0 ? await this.prisma.job.findMany({
            where: {
                job_id: { in: jobIdForAssoicated },
                jobTasks: { none: {} }
            },
            select: {
                job_id: true,
                jobCode: true,
                name: true,
                company: {
                    select: {
                        name: true,
                        company_id: true,
                    },
                },
                Function: {
                    select: {
                        name: true,
                        function_id: true,
                    },
                },
            },
        }) : [];

        const createdTaskWitoutTasks = jobIdForCreated.length > 0 ? await this.prisma.job.findMany({
            where: {
                job_id: { in: jobIdForCreated },
                jobTasks: { none: {} }
            },
            select: {
                job_id: true,
                jobCode: true,
                name: true,
                company: {
                    select: {
                        name: true,
                        company_id: true,
                    },
                },
                Function: {
                    select: {
                        name: true,
                        function_id: true,
                    },
                },
            },
        }) : [];

        return {
            associatedJobsWithoutTasks: assoicatedTaskWitoutTasks,
            createdJobsWithoutTasks: createdTaskWitoutTasks
        };
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
                        company_id: true,
                    },
                },
                Function: {
                    select: {
                        name: true,
                        function_id: true,
                    },
                },
            },
        });
    }

    async getJobsWithoutTableCreateByUsers(user_ids: number[]) {
        const jobData = await this.hierarchicalViewService.getJobDataByUserIds(user_ids);

        const jobIdForAssoicated = jobData.results?.map(result => {
            if (!result.success || !result.data) return null;
            return result.data.associatedJobs?.map(job => job.job_id) || [];
        }).flat().filter(id => id !== null) as number[];

        const jobIdForCreated = jobData.results?.map(result => {
            if (!result.success || !result.data) return null;
            return result.data.createdJobs?.map(job => job.job_id) || [];
        }).flat().filter(id => id !== null) as number[];

        const associatedJobsWithoutTable = jobIdForAssoicated.length > 0 ? await this.prisma.job.findMany({
            where: {
                job_id: { in: jobIdForAssoicated },
                table_job: { none: {} }
            },
            select: {
                job_id: true,
                jobCode: true,
                name: true,
                company: {
                    select: {
                        name: true,
                        company_id: true,
                    },
                },
                Function: {
                    select: {
                        name: true,
                        function_id: true,
                    },
                },
            },
        }) : [];

        const createdJobsWithoutTable = jobIdForCreated.length > 0 ? await this.prisma.job.findMany({
            where: {
                job_id: { in: jobIdForCreated },
                table_job: { none: {} }
            },
            select: {
                job_id: true,
                jobCode: true,
                name: true,
                company: {
                    select: {
                        name: true,
                        company_id: true,
                    },
                },
                Function: {
                    select: {
                        name: true,
                        function_id: true,
                    },
                },
            },
        }) : [];

        return {
            associatedJobsWithoutTable: associatedJobsWithoutTable,
            createdJobsWithoutTable: createdJobsWithoutTable
        };
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

    async getCompanyByUserIds(user_ids: number) {
        const companies = await this.prisma.company.findMany({
            where: {
                created_by: user_ids,
            },
            select: {
                company_id: true,
            },
        });

        if (!companies || companies.length === 0) {
            return [];
        }
        return companies;
    }
}
