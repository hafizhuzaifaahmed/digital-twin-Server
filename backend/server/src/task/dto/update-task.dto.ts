import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested, IsNotEmpty, MaxLength, MinLength, IsISO8601 } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateTaskSkillDto } from './update-task-skill.dto';

export class UpdateTaskDto {
  @ApiProperty({
    description: 'Name of the task',
    example: 'Assemble Widget',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Task name must be a string' })
  @IsNotEmpty({ message: 'Task name cannot be empty' })
  @MinLength(2, { message: 'Task name must be at least 2 characters long' })
  @MaxLength(255, { message: 'Task name cannot exceed 255 characters' })
  task_name?: string;

  @ApiProperty({
    description: 'Unique task code',
    example: 'AS-WG-001',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Task code must be a string' })
  @IsNotEmpty({ message: 'Task code cannot be empty' })
  @MinLength(2, { message: 'Task code must be at least 2 characters long' })
  @MaxLength(50, { message: 'Task code cannot exceed 50 characters' })
  task_code?: string;

  @ApiProperty({
    description: 'ID of the company this task belongs to',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'Company ID must be a valid integer' })
  @Min(1, { message: 'Company ID must be a positive number' })
  task_company_id?: number;

  @ApiProperty({
    description: 'Task capacity in minutes',
    example: 30,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'Task capacity must be a valid integer' })
  @Min(0, { message: 'Task capacity cannot be negative' })
  task_capacity_minutes?: number;

  @ApiProperty({
    description: 'ID of the process this task belongs to',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'Process ID must be a valid integer' })
  @Min(1, { message: 'Process ID must be a positive number' })
  task_process_id?: number;

  @ApiProperty({
    description: 'Overview description of the task',
    example: 'Assemble the widget parts into final product.',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Task overview must be a string' })
  @IsNotEmpty({ message: 'Task overview cannot be empty' })
  @MinLength(10, { message: 'Task overview must be at least 10 characters long' })
  @MaxLength(10000, { message: 'Task overview cannot exceed 10000 characters' })
  task_overview?: string;

  @ApiProperty({
    description: 'Array of job IDs to link to this task (replaces all existing job links)',
    type: [Number],
    example: [1, 2],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Job IDs must be an array' })
  @IsInt({ each: true, message: 'Each job ID must be a valid integer' })
  @Min(1, { each: true, message: 'Each job ID must be a positive number' })
  job_ids?: number[];

  @ApiProperty({
    description: 'Array of task skills required (replaces all existing skills)',
    type: [UpdateTaskSkillDto],
    required: false,
    example: [
      {
        skill_name: 'Soldering',
        level: 'EXPERT',
      },
      {
        skill_name: 'Wire Routing',
        level: 'INTERMEDIATE',
      },
    ],
  })
  @IsOptional()
  @IsArray({ message: 'Task skills must be an array' })
  @ValidateNested({ each: true, message: 'Each task skill must be a valid skill object' })
  @Type(() => UpdateTaskSkillDto)
  taskSkills?: UpdateTaskSkillDto[];

  @ApiProperty({
    description: 'Optimistic concurrency guard. Pass the last known updated_at ISO string of the task to avoid overwriting concurrent changes.',
    required: false,
    example: '2025-09-18T08:00:00.000Z',
  })
  @IsOptional()
  @IsString({ message: 'if_match_updated_at must be a string' })
  @IsISO8601({}, { message: 'if_match_updated_at must be a valid ISO 8601 date string (e.g., 2025-09-18T08:00:00.000Z)' })
  if_match_updated_at?: string;
}
