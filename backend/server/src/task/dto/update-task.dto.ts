import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateTaskSkillDto } from './update-task-skill.dto';

export class UpdateTaskDto {
  @ApiProperty({
    description: 'Name of the task',
    example: 'Assemble Widget',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  task_name?: string;

  @ApiProperty({
    description: 'Unique task code',
    example: 'AS-WG-001',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  task_code?: string;

  @ApiProperty({
    description: 'ID of the company this task belongs to',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  task_company_id?: number;

  @ApiProperty({
    description: 'Task capacity in minutes',
    example: 30,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  task_capacity_minutes?: number;

  @ApiProperty({
    description: 'ID of the process this task belongs to',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  task_process_id?: number;

  @ApiProperty({
    description: 'Overview description of the task',
    example: 'Assemble the widget parts into final product.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  task_overview?: string;

  @ApiProperty({
    description: 'Array of job IDs to link to this task (replaces all existing job links)',
    type: [Number],
    example: [1, 2],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateTaskSkillDto)
  taskSkills?: UpdateTaskSkillDto[];

  @ApiProperty({
    description: 'Optimistic concurrency guard. Pass the last known updated_at ISO string of the task to avoid overwriting concurrent changes.',
    required: false,
    example: '2025-09-18T08:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  if_match_updated_at?: string;
}
