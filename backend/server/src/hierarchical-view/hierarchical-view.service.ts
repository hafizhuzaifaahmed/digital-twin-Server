import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserProcessResult, BatchProcessResult } from './dto/hierarchical-types';

@Injectable()
export class HierarchicalViewService {

    constructor(private readonly prisma: PrismaService) { }

    // Utility function to validate user ID arrays
    private validateUserIds(userIds: number[]): void {
        if (!Array.isArray(userIds) || userIds.length === 0) {
            throw new NotFoundException('User IDs array is required and cannot be empty');
        }

        const invalidIds = userIds.filter(id => !Number.isFinite(id) || id <= 0);
        if (invalidIds.length > 0) {
            throw new NotFoundException(`Invalid user IDs: ${invalidIds.join(', ')}`);
        }
    }

    // Generic function to process multiple users with error handling
    private async processMultipleUsers<T>(
        userIds: number[],
        processor: (userId: number) => Promise<T>
    ): Promise<BatchProcessResult<T>> {
        this.validateUserIds(userIds);

        const results = await Promise.all(
            userIds.map(async (userId) => {
                try {
                    const data = await processor(userId);
                    return {
                        userId,
                        success: true,
                        data
                    };
                } catch (error) {
                    return {
                        userId,
                        success: false,
                        error: error.message
                    };
                }
            })
        );

        return {
            totalUsers: userIds.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
        };
    }

    // Generic function to fetch user with validation
    private async getValidatedUser(userId: number) {
        const user = await this.prisma.user.findUnique({
            where: { user_id: userId },
        });

        if (!user) {
            throw new NotFoundException(`User ${userId} not found`);
        }

        return user;
    }

    // Generic function to get entities by company IDs for associated and created companies
    private async getEntitiesByCompanies<T>(
        userId: number,
        entityFetcher: (companyId: number) => Promise<T[]>
    ): Promise<{ associatedEntities: T[], createdEntities: T[] }> {
        const user = await this.getValidatedUser(userId);

        // Get associated entities (from user's company)
        const associatedEntities = user.company_id
            ? await entityFetcher(user.company_id)
            : [];

        // Get created entities (from companies created by user)
        const createdCompanies = await this.getCompanyCreatedByUser(userId);
        const createdEntitiesArrays = await Promise.all(
            createdCompanies.map(company => entityFetcher(company.company_id))
        );
        const createdEntities = createdEntitiesArrays.flat();

        return { associatedEntities, createdEntities };
    }



    async getCompanyDataByUserIds(userIds: number[]) {
        return this.processMultipleUsers(userIds, async (userId) => {
            const user = await this.prisma.user.findUnique({
                where: { user_id: userId },
                select: { user_id: true, name: true, email: true, company_id: true },
            });

            if (!user) {
                throw new NotFoundException(`User ${userId} not found`);
            }

            // Get associated company data (if user has company_id)
            let associatedCompany: any = null;
            if (user.company_id) {
                associatedCompany = await this.getCompanyData(user.company_id);
            }

            // Get created companies by this user
            const createdCompanies = await this.prisma.company.findMany({
                where: { created_by: userId },
                select: { company_id: true },
            });

            const createdCompanyData = await Promise.all(
                (createdCompanies || []).map((c) => this.getCompanyData(c.company_id))
            );

            return {
                user: { id: user.user_id, name: user.name, email: user.email, companyId: user.company_id ?? null },
                associatedCompany,
                createdCompanies: createdCompanyData
            };
        });
    }

    async getUserHierarchy(userId: number) {
        const user = await this.prisma.user.findUnique({
            where: { user_id: userId },
            select: { user_id: true, name: true, email: true, company_id: true },
        });

        if (!user) {
            throw new NotFoundException(`User ${userId} not found`);
        }

        return this.buildUserHierarchy(user);
    }

    private async buildUserHierarchy(user: { user_id: number; name: string; email: string; company_id: number | null }) {
        // Assigned company data (if any)
        let companyAssigned: any = null;
        if (user.company_id) {
            companyAssigned = await this.getCompanyData(user.company_id);
        }

        // Companies created by the user
        const createdCompanies = await this.prisma.company.findMany({
            where: { created_by: user.user_id },
            select: { company_id: true },
        });

        const companyCreated = await Promise.all(
            (createdCompanies || []).map((c) => this.getCompanyData(c.company_id))
        );

        return {
            user: { id: user.user_id, name: user.name, email: user.email, companyId: user.company_id ?? null },
            companyAssigned,
            companyCreated,
        };
    }

    private async getCompanyData(companyId: number) {
        const company = await this.prisma.company.findUnique({
            where: { company_id: companyId },

        });

        if (!company) {
            throw new NotFoundException(`Company ${companyId} not found`);
        }

        return company;
    }

    async getBuildingData(userId: number) {
        const user = await this.getValidatedUser(userId);

        const associateCompanyData = user.company_id
            ? await this.prisma.company.findUnique({
                where: { company_id: user.company_id },
            })
            : null;

        const associatedCompanyBuildings = associateCompanyData ? await this.prisma.building.findMany({
            where: { company_id: associateCompanyData.company_id },
        }) : [];

        const createdCompanies = await this.prisma.company.findMany({
            where: { created_by: userId },
        });

        const createdCompanyBuildings = await Promise.all(
            createdCompanies.map((company) =>
                this.prisma.building.findMany({
                    where: { company_id: company.company_id },
                })
            )
        );

        return { user, associatedCompanyBuildings, createdCompanyBuildings: createdCompanyBuildings.flat() };
    }

    async getUserHierarchyByUserIds(userIds: number[]) {
        return this.processMultipleUsers(userIds, (userId) => this.getUserHierarchy(userId));
    }

    async getBuildingDataByUserIds(userIds: number[]) {
        return this.processMultipleUsers(userIds, (userId) => this.getBuildingData(userId));
    }

    async getProcessDataByUserIds(userIds: number[]) {
        return this.processMultipleUsers(userIds, async (userId) => {
            const user = await this.getValidatedUser(userId);

            const associateCompanyData = user.company_id
                ? await this.prisma.company.findUnique({
                    where: { company_id: user.company_id },
                })
                : null;

            let associatedProcesses: any[] = [];
            if (associateCompanyData) {
                associatedProcesses = await this.prisma.process.findMany({
                    where: { company_id: associateCompanyData.company_id },
                });
            }

            const createdCompanies = await this.getCompanyCreatedByUser(userId);
            const createdProcesses = await Promise.all(
                createdCompanies.map((company) =>
                    this.prisma.process.findMany({
                        where: { company_id: company.company_id },
                    })
                )
            );

            if (createdProcesses && createdProcesses.length > 0) {
                associatedProcesses.push(...createdProcesses.flat());
            }

            return {
                user,
                associatedProcesses,
                createdProcesses: createdProcesses.flat()
            };
        });
    }


    async getFunctionsDataByUserIds(userIds: number[]) {
        return this.processMultipleUsers(userIds, async (userId) => {
            const { associatedEntities, createdEntities } = await this.getEntitiesByCompanies(
                userId,
                (companyId) => this.prisma.function.findMany({ where: { company_id: companyId } })
            );

            const user = await this.getValidatedUser(userId);
            return {
                user,
                associatedFunctions: associatedEntities,
                createdFunctions: createdEntities
            };
        });
    }
    async getTaskDataByUserIds(userIds: number[]) {
        return this.processMultipleUsers(userIds, async (userId) => {
            const { associatedEntities, createdEntities } = await this.getEntitiesByCompanies(
                userId,
                (companyId) => this.prisma.task.findMany({ where: { task_company_id: companyId } })
            );

            const user = await this.getValidatedUser(userId);
            return {
                user,
                associatedTasks: associatedEntities,
                createdTasks: createdEntities
            };
        });
    }
    async getJobDataByUserIds(userIds: number[]) {
        return this.processMultipleUsers(userIds, async (userId) => {
            const { associatedEntities, createdEntities } = await this.getEntitiesByCompanies(
                userId,
                (companyId) => this.prisma.job.findMany({ where: { company_id: companyId } })
            );

            const user = await this.getValidatedUser(userId);
            return {
                user,
                associatedJobs: associatedEntities,
                createdJobs: createdEntities
            };
        });
    }

    async getFloorDataByUserIds(userIds: number[]) {
        return this.processMultipleUsers(userIds, async (userId) => {
            const user = await this.getValidatedUser(userId);

            const associatedCompaniesBuildings = user.company_id
                ? await this.getBuildingDataByCompanyId(user.company_id)
                : [];
            const associatedFloors = await this.getFloorDataByBuildingIds(associatedCompaniesBuildings.map(b => b.building_id));

            const createdCompanies = await this.getCompanyCreatedByUser(userId);
            const createdCompaniesBuildings = await Promise.all(
                createdCompanies.map((company) =>
                    this.getBuildingDataByCompanyId(company.company_id)
                )
            );
            const createdFloors = await this.getFloorDataByBuildingIds(createdCompaniesBuildings.flat().map(b => b.building_id));

            return {
                associatedFloors: associatedFloors,
                createdFloors: createdFloors
            };
        });
    }

    getFloorDataByBuildingIds(buildingIds: number[]) {
        return this.prisma.floor.findMany({
            where: { building_id: { in: buildingIds } },
        });
    }
    async getBuildingDataByCompanyId(companyId: number) {
        const buildings = await this.prisma.building.findMany({
            where: { company_id: companyId },
        });
        return buildings;
    }

    async getCompanyCreatedByUser(userId: number) {
        const companies = await this.prisma.company.findMany({
            where: { created_by: userId },
        });
        return companies;
    }

    async getRoomHierarchyByUserIds(userIds: number[]) {
        return this.processMultipleUsers(userIds, async (userId) => {
            const user = await this.getValidatedUser(userId);
            const associatedCompaniesBuildings = user.company_id
                ? await this.getBuildingDataByCompanyId(user.company_id)
                : [];
            const associatedfloors = await this.getFloorDataByBuildingIds(associatedCompaniesBuildings.map(b => b.building_id));

            const associatedRooms = await this.getRoomDataByFloorIds(associatedfloors.map(f => f.floor_id));
            const createdCompanies = await this.getCompanyCreatedByUser(userId);
            const createdCompaniesBuildings = await Promise.all(
                createdCompanies.map((company) =>
                    this.getBuildingDataByCompanyId(company.company_id)
                )
            );
            const createdfloors = await this.getFloorDataByBuildingIds(createdCompaniesBuildings.flat().map(b => b.building_id));
            const createdRooms = await this.getRoomDataByFloorIds(createdfloors.map(f => f.floor_id));

            return {

                associatedRooms,
                createdRooms
            };
        });

    }


    async getUserByCreatedBy(userId: number) {
        const users = await this.prisma.user.findMany({
            where: { created_by: userId },
        });
        return {
            message: 'User Created by ' + userId,
            users
        };
    }

    async getUserByCreatedBy3DUser(userId: number) {
        const users = await this.prisma.users_3d.findMany({
            where: { created_by: userId },
        });
        return {
            message: ' For 3D User Created by ' + userId,
            users
        };
    }


    async getPeopleDataByUserIds(userIds: number[]) {
        return this.processMultipleUsers(userIds, async (userId) => {
            const user = await this.getValidatedUser(userId);
            const associatedCompanyData = user.company_id
                ? await this.getCompanyData(user.company_id)
                : null;

            const assoiatedPeople = this.prisma.people.findMany({ where: { company_id: associatedCompanyData?.company_id } });

            const createdCompanies = await this.getCompanyCreatedByUser(userId);
            const createdPeopleArrays = await Promise.all(
                createdCompanies.map((company) =>
                    this.prisma.people.findMany({ where: { company_id: company.company_id } })
                )
            );
            const createdPeople = createdPeopleArrays.flat();

            return {
                user,
                associatedPeople: assoiatedPeople,
                createdPeople: createdPeople
            };
        });


    }


    getPeopleDataByCompanyIds(companyIds: number[]) {
        return this.prisma.people.findMany({
            where: { company_id: { in: companyIds } },
        });
    }
    getRoomDataByFloorIds(floorIds: number[]) {
        return this.prisma.room.findMany({
            where: { floor_id: { in: floorIds } },
        });
    }
}
