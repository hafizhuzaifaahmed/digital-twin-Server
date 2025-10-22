import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { JobService } from './job.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

@Controller('job')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post()
  create(@Body() dto: CreateJobDto) {
    return this.jobService.create(dto);
  }

  @Get()
  findAll() {
    return this.jobService.findAll();
  }

  @Get('with-relations')
  findAllWithRelations() {
    return this.jobService.findAllWithRelations();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.jobService.findOne(id);
  }

  @Get(':id/with-relations')
  findOneWithRelations(@Param('id', ParseIntPipe) id: number) {
    return this.jobService.findOneWithRelations(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateJobDto) {
    return this.jobService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.jobService.remove(id);
  }

  // Connect/Disconnect endpoints for skills
  @Post(':id/skills')
  connectSkill(
    @Param('id', ParseIntPipe) id: number,
    @Body('skillid', ParseIntPipe) skillid: number,
    @Body('skill_level_id', ParseIntPipe) skill_level_id: number,
  ) {
    return this.jobService.connectSkill(id, skillid, skill_level_id);
  }

  @Delete(':id/skills/:skillid')
  disconnectSkill(
    @Param('id', ParseIntPipe) id: number,
    @Param('skillid', ParseIntPipe) skillid: number,
  ) {
    return this.jobService.disconnectSkill(id, skillid);
  }

  // Connect/Disconnect endpoints for tasks
  @Post(':id/tasks')
  connectTask(
    @Param('id', ParseIntPipe) id: number,
    @Body('task_id', ParseIntPipe) task_id: number,
  ) {
    return this.jobService.connectTask(id, task_id);
  }

  @Delete(':id/tasks/:taskid')
  disconnectTask(
    @Param('id', ParseIntPipe) id: number,
    @Param('taskid', ParseIntPipe) taskid: number,
  ) {
    return this.jobService.disconnectTask(id, taskid);
  }
}
