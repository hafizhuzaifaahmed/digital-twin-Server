import { Controller, Get } from '@nestjs/common';
import { UnassignedEntitiesService } from './unassigned-entities.service';

@Controller('unassigned-entities')
export class UnassignedEntitiesController {
  constructor(private readonly unassignedEntitiesService: UnassignedEntitiesService) { }

  @Get('unassigned-processes-without-tasks')
  async getUnassignedProcessesToTasks() {
    return this.unassignedEntitiesService.getprocessesWithoutTasks();
  }
  @Get('unassigned-tasks-without-processes')
  async getUnassignedTasksWithoutProcesses() {
    return this.unassignedEntitiesService.getTaskWithoutProcesses();
  }
  @Get('unassigned-jobs-without-tasks')
  async getUnassignedJobsWithoutTasks() {
    return this.unassignedEntitiesService.getJobsWithoutTasks();
  }
  @Get('unassigned-jobs-without-table')
  async getUnassignedJobsWithoutTable() {
    return this.unassignedEntitiesService.getJobsWithoutTable();
  }
  @Get('count-unassigned-jobs-without-tasks')
  async countUnassignedJobsWithoutTasks() {
    return this.unassignedEntitiesService.countjobsWithoutTasks();
  }
}