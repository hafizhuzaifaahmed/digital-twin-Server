import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsString, ValidateNested, Min, ArrayNotEmpty, IsOptional, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTaskSkillDto } from './create-task-skill.dto';

export class CreateTaskDto {
  @ApiProperty({
    description: 'Name of the task',
    example: 'Assemble Widget',
  })
  @IsString({ message: 'Task name must be a string' })
  @IsNotEmpty({ message: 'Task name is required' })
  @MinLength(2, { message: 'Task name must be at least 2 characters long' })
  @MaxLength(255, { message: 'Task name cannot exceed 255 characters' })
  task_name: string;

  @ApiProperty({
    description: 'Unique task code',
    example: 'AS-WG-001',
  })
  @IsString({ message: 'Task code must be a string' })
  @IsNotEmpty({ message: 'Task code is required' })
  @MinLength(2, { message: 'Task code must be at least 2 characters long' })
  @MaxLength(50, { message: 'Task code cannot exceed 50 characters' })
  task_code: string;

  @ApiProperty({
    description: 'ID of the company this task belongs to',
    example: 1,
  })
  @IsInt({ message: 'Company ID must be a valid integer' })
  @Min(1, { message: 'Company ID must be a positive number' })
  task_company_id: number;

  @ApiProperty({
    description: 'Task capacity in minutes',
    example: 30,
  })
  @IsInt({ message: 'Task capacity must be a valid integer' })
  @Min(0, { message: 'Task capacity cannot be negative' })
  task_capacity_minutes: number;

  @ApiProperty({
    description: 'ID of the process this task belongs to (optional)',
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
  })
  @IsString({ message: 'Task overview must be a string' })
  @IsNotEmpty({ message: 'Task overview is required' })
  @MinLength(10, { message: 'Task overview must be at least 10 characters long' })
  @MaxLength(10000, { message: 'Task overview cannot exceed 10000 characters' })
  task_overview: string;

  @ApiProperty({
    description: 'Array of job IDs to link to this task (optional)',
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
    description: 'Array of task skills required (optional)',
    type: [CreateTaskSkillDto],
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
  @Type(() => CreateTaskSkillDto)
  taskSkills?: CreateTaskSkillDto[];
}
