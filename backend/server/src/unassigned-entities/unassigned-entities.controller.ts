import { Body, Controller, Get, Post } from '@nestjs/common';
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
  @Post('unassigned-processes-without-tasks-by-users')
  async getUnassignedProcessesToTasksByUsers(@Body() user_ids: number[]) {
    return this.unassignedEntitiesService.getprocessesWithoutTasksCreateByUsers(user_ids);
  }
  @Post('unassigned-tasks-without-processes-by-users')
  async getUnassignedTasksWithoutProcessesByUsers(@Body() user_ids: number[]) {
    return this.unassignedEntitiesService.getTaskWithoutProcessesCreateByUsers(user_ids);
  }

  @Post('unassigned-jobs-without-tasks-by-users')
  async getUnassignedJobsWithoutTasksByUsers(@Body() user_ids: number[]) {
    return this.unassignedEntitiesService.getJobsWithoutTasksCreateByUsers(user_ids);
  }
  @Post('unassigned-jobs-without-table-by-users')
  async getUnassignedJobsWithoutTableByUsers(@Body() user_ids: number[]) {
    return this.unassignedEntitiesService.getJobsWithoutTableCreateByUsers(user_ids);
  }
}