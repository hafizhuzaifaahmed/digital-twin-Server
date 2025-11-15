import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProcessService } from './process.service';
import { CreateProcessDto } from './dto/create-process.dto';
import { UpdateProcessDto } from './dto/update-process.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('processes')
@Controller('process')
export class ProcessController {
  constructor(private readonly processService: ProcessService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new process with optional workflow' })
  @ApiBody({
    type: CreateProcessDto,
    description: 'Process creation data with optional workflow tasks',
    examples: {
      basic: {
        summary: 'Basic process creation',
        value: {
          process_name: 'Manufacturing Process',
          process_code: 'PROC001',
          company_id: 1,
          process_overview: 'Complete manufacturing workflow from raw materials to finished products.',
        },
      },
      withWorkflow: {
        summary: 'Process with workflow tasks',
        value: {
          process_name: 'Assembly Line Process',
          process_code: 'PROC002',
          company_id: 1,
          process_overview: 'Sequential assembly line operations.',
          workflow: [
            { task_id: 1, order: 1 },
            { task_id: 2, order: 2 },
            { task_id: 3, order: 3 },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Process created successfully with calculated capacity.',
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed.' })
  @ApiResponse({ status: 404, description: 'Referenced tasks not found.' })
  create(@Body() createProcessDto: CreateProcessDto) {
    return this.processService.create(createProcessDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all processes (basic data only)' })
  @ApiResponse({
    status: 200,
    description: 'List of processes without relations.',
  })
  findAll() {
    return this.processService.findAll();
  }

  @Get('with-relations')
  @ApiOperation({ summary: 'Get all processes with full relations and workflow' })
  @ApiResponse({
    status: 200,
    description: 'List of processes with company, parent relations, and ordered workflow tasks.',
  })
  findAllWithRelations() {
    return this.processService.findAllWithRelations();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a process by ID (basic data only)' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Process ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Process found.' })
  @ApiResponse({ status: 404, description: 'Process not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.processService.findOne(id);
  }

  @Get('companyId/:company_id')
  findByCompany(@Param('company_id', ParseIntPipe) company_id: number) {
    return this.processService.processswithCompany(company_id);
  }

  @Get(':id/with-relations')
  @ApiOperation({ summary: 'Get a process by ID with full relations and workflow' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Process ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Process found with company, parent relations, and ordered workflow tasks.',
  })
  @ApiResponse({ status: 404, description: 'Process not found.' })
  findOneWithRelations(@Param('id', ParseIntPipe) id: number) {
    return this.processService.findOneWithRelations(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a process and optionally replace its workflow' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Process ID',
    example: 1,
  })
  @ApiBody({
    type: UpdateProcessDto,
    description: 'Process update data - all fields optional, workflow replaces existing tasks',
    examples: {
      basicUpdate: {
        summary: 'Update basic process fields',
        value: {
          process_name: 'Updated Manufacturing Process',
          process_overview: 'Updated process description.',
        },
      },
      workflowUpdate: {
        summary: 'Update workflow tasks',
        value: {
          workflow: [
            { task_id: 1, order: 1 },
            { task_id: 3, order: 2 },
            { task_id: 5, order: 3 },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Process updated successfully with recalculated capacity.',
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed.' })
  @ApiResponse({ status: 404, description: 'Process or referenced tasks not found.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProcessDto: UpdateProcessDto,
  ) {
    return this.processService.update(id, updateProcessDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a process and its workflow' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Process ID',
    example: 1,
  })
  @ApiResponse({
    status: 204,
    description: 'Process deleted successfully (cascades to process_task entries).',
  })
  @ApiResponse({ status: 404, description: 'Process not found.' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.processService.remove(id);
  }

  // Connect/Disconnect endpoints for tasks
  @Post(':id/tasks')
  connectTask(
    @Param('id', ParseIntPipe) id: number,
    @Body('task_id', ParseIntPipe) task_id: number,
  ) {
    return this.processService.connectTask(id, task_id);
  }

  @Delete(':id/tasks/:taskid')
  disconnectTask(
    @Param('id', ParseIntPipe) id: number,
    @Param('taskid', ParseIntPipe) taskid: number,
  ) {
    return this.processService.disconnectTask(id, taskid);
  }

}
