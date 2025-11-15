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
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { TaskService, TaskWithRelations } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@ApiTags('tasks')
@Controller('task')
export class TaskController {
  constructor(private readonly taskService: TaskService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new task with task skills' })
  @ApiBody({
    type: CreateTaskDto,
    description: 'Task creation data with skills',
    examples: {
      example1: {
        summary: 'Widget Assembly Task',
        value: {
          task_name: 'Assemble Widget',
          task_code: 'AS-WG-001',
          task_company_id: 1,
          task_capacity_minutes: 30,
          task_process_id: 2,
          task_overview: 'Assemble the widget parts into final product.',
          taskSkills: [
            {
              skill_name: 'Soldering',
              level: 'EXPERT',
            },
            {
              skill_name: 'Wire Routing',
              level: 'INTERMEDIATE',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully',
    type: 'object',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
  })
  async create(@Body() createTaskDto: CreateTaskDto): Promise<TaskWithRelations> {
    return this.taskService.create(createTaskDto);
  }

  @Get('companyId/:company_id')
  async getTasksByCompany(@Param('company_id', ParseIntPipe) company_id: number): Promise<any> {
    return this.taskService.taskswithCompany(company_id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks (basic data only)' })
  @ApiResponse({
    status: 200,
    description: 'List of all tasks without relations',
    type: 'array',
  })
  async findAll() {
    return this.taskService.findAllBasic();
  }

  @Get('with-relations')
  @ApiOperation({ summary: 'Get all tasks with their skills and relations' })
  @ApiResponse({
    status: 200,
    description: 'List of all tasks with relations',
    type: 'array',
  })
  async findAllWithRelations(): Promise<TaskWithRelations[]> {
    return this.taskService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific task by ID (basic data only)' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Task ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Task found without relations',
    type: 'object',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  async findOneBasic(@Param('id', ParseIntPipe) id: number) {
    return this.taskService.findOneBasic(id);
  }

  @Get(':id/with-relations')
  @ApiOperation({ summary: 'Get a specific task by ID with relations' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Task ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Task found with relations',
    type: 'object',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  async findOneWithRelations(@Param('id', ParseIntPipe) id: number): Promise<TaskWithRelations> {
    return this.taskService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task and replace its skills/jobs atomically' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Task ID',
    example: 1,
  })
  @ApiBody({
    type: UpdateTaskDto,
    description: 'Task update data - all fields optional, taskSkills and job_ids replace existing ones',
  })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully',
    type: 'object',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskDto: UpdateTaskDto,
  ): Promise<TaskWithRelations> {
    return this.taskService.update(id, updateTaskDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a task and its associated task skills' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Task ID',
    example: 1,
  })
  @ApiResponse({
    status: 204,
    description: 'Task deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.taskService.remove(id);
  }
}
