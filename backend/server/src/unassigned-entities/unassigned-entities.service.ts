import { Injectable, NotFoundException } from '@nestjs/common';
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
                        company_id: true,
                    },
                },
            },
        });
    }

    async getprocessesWithoutTasksCreateByUsers(user_ids: number[]) {
        const companiesPromises = user_ids.map((user_id) => {
            return this.getCompanyByUserIds(user_id);  // your own function (returns array)
        });


        const companiesResults = await Promise.all(companiesPromises);


        const companyIds = companiesResults
            .flat()
            .map((company) => company.company_id);

        if (companyIds.length === 0) {
            throw new NotFoundException(`No companies found for given users.`);
        }

        return this.prisma.process.findMany({
            where: {
                company_id: { in: companyIds },
                process_task: { none: {} },  // <-- replace if your relation name is different
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

    async getTaskWithoutProcessesCreateByUsers(user_ids: number[]) {
        const companiesPromises = user_ids.map((user_id) => {
            return this.getCompanyByUserIds(user_id);  // your own function (returns array)
        });
        const companiesResults = await Promise.all(companiesPromises);
        const companyIds = companiesResults
            .flat()
            .map((company) => company.company_id);
        if (companyIds.length === 0) {
            throw new NotFoundException(`No companies found for given users.`);
        }
        return this.prisma.task.findMany({
            where: {
                task_company_id: { in: companyIds },
                process_task: { none: {} },
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
        const companiesPromises = user_ids.map((user_id) => {
            return this.getCompanyByUserIds(user_id);  // your own function (returns array)
        });
        const companiesResults = await Promise.all(companiesPromises);
        const companyIds = companiesResults
            .flat()
            .map((company) => company.company_id);
        if (companyIds.length === 0) {
            throw new NotFoundException(`No companies found for given users.`);
        }
        return this.prisma.job.findMany({
            where: {
                company_id: { in: companyIds },
                jobTasks: { none: {} },
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
        const companiesPromises = user_ids.map((user_id) => {
            return this.getCompanyByUserIds(user_id);  // your own function (returns array)
        });
        const companiesResults = await Promise.all(companiesPromises);
        const companyIds = companiesResults
            .flat()
            .map((company) => company.company_id);
        if (companyIds.length === 0) {
            throw new NotFoundException(`No companies found for given users.`);
        }
        return this.prisma.job.findMany({
            where: {
                company_id: { in: companyIds },
                table_job: { none: {} },
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
            throw new Error(`No companies found for user IDs: ${user_ids}`);
        }
        return companies;
    }


}



