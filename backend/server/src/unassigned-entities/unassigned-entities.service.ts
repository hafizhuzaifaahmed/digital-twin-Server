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

        const associatedProcessIds: number[] = [];
        const createdProcessIds: number[] = [];

        processData.results?.forEach(result => {
            if (result.success && result.data) {
                // Only associated processes NOT created by this user
                result.data.associatedProcesses?.forEach(proc => {
                    if (proc.createdProcesses?.some(cp => cp.process_id === proc.process_id)) {
                        associatedProcessIds.push(proc.process_id);
                    }
                });

                // Created processes
                result.data.createdProcesses?.forEach(proc => {
                    createdProcessIds.push(proc.process_id);
                });
            }
        });

        // Remove duplicates
        const uniqueAssociatedIds = [...new Set(associatedProcessIds)];
        const uniqueCreatedIds = [...new Set(createdProcessIds)];

        // Fetch associated processes without tasks
        const associatedWithoutTasks = uniqueAssociatedIds.length > 0
            ? await this.prisma.process.findMany({
                where: {
                    process_id: { in: uniqueAssociatedIds },
                    process_task: { none: {} }
                },
                select: {
                    process_id: true,
                    process_code: true,
                    process_name: true,
                    company: {
                        select: {
                            name: true,
                            company_id: true,
                        },
                    },
                },
            })
            : [];

        // Fetch created processes without tasks
        const createdWithoutTasks = uniqueCreatedIds.length > 0
            ? await this.prisma.process.findMany({
                where: {
                    process_id: { in: uniqueCreatedIds },
                    process_task: { none: {} }
                },
                select: {
                    process_id: true,
                    process_code: true,
                    process_name: true,
                    company: {
                        select: {
                            name: true,
                            company_id: true,
                        },
                    },
                },
            })
            : [];

        return {
            associatedProcessesWithoutTasks: associatedWithoutTasks,
            createdProcessesWithoutTasks: createdWithoutTasks
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

        const results = userTaskData.results?.map(result => {
            if (!result.success || !result.data) return null;
            const uid = result.data.user.user_id;

            // Created tasks without process
            const createdTasksWithoutProcess = result.data.createdTasks?.filter(
                t => t.task_process_id === null
            ).map(t => ({
                task_id: t.task_id,
                task_code: t.task_code,
                task_name: t.task_name,
                task_company_id: t.task_company_id,
                user_id: uid
            }));

            // Associated tasks without process
            const associatedTasksWithoutProcess = result.data.associatedTasks?.filter(
                t => t.task_process_id === null
            ).map(t => ({
                task_id: t.task_id,
                task_code: t.task_code,
                task_name: t.task_name,
                task_company_id: t.task_company_id,
                user_id: uid
            }));

            return {
                user_id: uid,

                associatedTasksWithoutProcess: associatedTasksWithoutProcess.length > 0 ? associatedTasksWithoutProcess : null
            };
        }).filter(r => r !== null);

        return {

            results,
            message: 'Fetched tasks without processes for specified users.'
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
        }
        ).flat().filter(id => id !== null) as number[];

        const jobIdForCreated = jobData.results?.map(result => {
            if (!result.success || !result.data) return null;
            return result.data.createdJobs?.map(job => job.job_id) || [];
        }
        ).flat().filter(id => id !== null) as number[];

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
        }
        ).flat().filter(id => id !== null) as number[];

        const jobIdForCreated = jobData.results?.map(result => {
            if (!result.success || !result.data) return null;
            return result.data.createdJobs?.map(job => job.job_id) || [];
        }
        ).flat().filter(id => id !== null) as number[];

        const associatedJobsWithoutTasks = jobIdForAssoicated.length > 0 ? await this.prisma.job.findMany({
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

        const createdJobsWithoutTasks = jobIdForCreated.length > 0 ? await this.prisma.job.findMany({
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
            associatedJobsWithoutTasks,
            createdJobsWithoutTasks
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
        // If a user hasn't created any companies, return an empty array
        // so Promise.all callers can aggregate results without failing early.
        if (!companies || companies.length === 0) {
            return [];
        }
        return companies;
    }


}



