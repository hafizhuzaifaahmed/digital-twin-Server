import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, IsPositive, IsOptional, IsArray, ValidateNested, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkflowTaskDto } from './workflow-task.dto';

export class CreateProcessDto {
  @ApiProperty({
    description: 'Process name',
    example: 'Manufacturing Process',
  })
  @IsString({ message: 'Process name must be a string' })
  @IsNotEmpty({ message: 'Process name is required' })
  @MinLength(2, { message: 'Process name must be at least 2 characters long' })
  @MaxLength(255, { message: 'Process name cannot exceed 255 characters' })
  process_name: string;

  @ApiProperty({
    description: 'Process code (unique identifier)',
    example: 'PROC001',
  })
  @IsString({ message: 'Process code must be a string' })
  @IsNotEmpty({ message: 'Process code is required' })
  @MinLength(2, { message: 'Process code must be at least 2 characters long' })
  @MaxLength(50, { message: 'Process code cannot exceed 50 characters' })
  process_code: string;

  @ApiProperty({
    description: 'Company ID that owns this process',
    example: 1,
  })
  @IsInt({ message: 'Company ID must be a valid integer' })
  @IsPositive({ message: 'Company ID must be a positive number' })
  company_id: number;

  @ApiProperty({
    description: 'Process overview description',
    example: 'This process handles the complete manufacturing workflow from raw materials to finished products.',
  })
  @IsString({ message: 'Process overview must be a string' })
  @IsNotEmpty({ message: 'Process overview is required' })
  @MinLength(10, { message: 'Process overview must be at least 10 characters long' })
  @MaxLength(10000, { message: 'Process overview cannot exceed 10000 characters' })
  process_overview: string;

  @ApiProperty({
    description: 'Parent process ID (optional, for hierarchical processes)',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'Parent process ID must be a valid integer' })
  @IsPositive({ message: 'Parent process ID must be a positive number' })
  parent_process_id?: number;

  @ApiProperty({
    description: 'Parent task ID (optional, if this process is derived from a task)',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'Parent task ID must be a valid integer' })
  @IsPositive({ message: 'Parent task ID must be a positive number' })
  parent_task_id?: number;

  @ApiProperty({
    description: 'Workflow tasks with their job assignments and order sequence',
    type: [WorkflowTaskDto],
    example: [
      { task_id: 1, job_id: 10, order: 1 },
      { task_id: 2, job_id: 15, order: 2 },
      { task_id: 3, job_id: 20, order: 3 }
    ],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Workflow must be an array of workflow tasks' })
  @ValidateNested({ each: true, message: 'Each workflow item must be a valid workflow task' })
  @Type(() => WorkflowTaskDto)
  workflow?: WorkflowTaskDto[];
}
