import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { TableService, TableAssignmentService } from './table.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { AssignJobDto } from './dto/assign-job.dto';

@Controller('table')
export class TableController {
  constructor(
    private readonly tableService: TableService,
    private readonly tableAssignmentService: TableAssignmentService,
  ) {}

  @Post()
  create(@Body() dto: CreateTableDto) {
    return this.tableService.create(dto);
  }

  @Get()
  findAll() {
    return this.tableService.findAll();
  }

  @Get('with-relations')
  findAllWithRelations() {
    return this.tableService.findAllWithRelations();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tableService.findOne(id);
  }

  @Get(':id/with-relations')
  findOneWithRelations(@Param('id', ParseIntPipe) id: number) {
    return this.tableService.findOneWithRelations(id);
  }

  @Get(':id/jobs')
  listJobs(@Param('id', ParseIntPipe) id: number) {
    return this.tableAssignmentService.listJobs(id);
  }

  @Post(':id/jobs')
  assignJob(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignJobDto) {
    return this.tableAssignmentService.assignJob(id, dto);
  }

  @Delete(':id/jobs/:jobId')
  unassignJob(
    @Param('id', ParseIntPipe) id: number,
    @Param('jobId', ParseIntPipe) jobId: number,
  ) {
    return this.tableAssignmentService.unassignJob(id, jobId);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTableDto) {
    return this.tableService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tableService.remove(id);
  }
}
