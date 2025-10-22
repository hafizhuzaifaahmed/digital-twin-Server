import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, IsPositive, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkflowTaskDto } from './workflow-task.dto';

export class CreateProcessDto {
  @ApiProperty({
    description: 'Process name',
    example: 'Manufacturing Process',
  })
  @IsString()
  @IsNotEmpty()
  process_name: string;

  @ApiProperty({
    description: 'Process code (unique identifier)',
    example: 'PROC001',
  })
  @IsString()
  @IsNotEmpty()
  process_code: string;

  @ApiProperty({
    description: 'Company ID that owns this process',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  company_id: number;

  @ApiProperty({
    description: 'Process overview description',
    example: 'This process handles the complete manufacturing workflow from raw materials to finished products.',
  })
  @IsString()
  @IsNotEmpty()
  process_overview: string;

  @ApiProperty({
    description: 'Parent process ID (optional, for hierarchical processes)',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  parent_process_id?: number;

  @ApiProperty({
    description: 'Parent task ID (optional, if this process is derived from a task)',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowTaskDto)
  workflow?: WorkflowTaskDto[];
}
