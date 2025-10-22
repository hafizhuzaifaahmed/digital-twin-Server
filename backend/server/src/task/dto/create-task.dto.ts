import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsString, ValidateNested, Min, ArrayNotEmpty, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTaskSkillDto } from './create-task-skill.dto';

export class CreateTaskDto {
  @ApiProperty({
    description: 'Name of the task',
    example: 'Assemble Widget',
  })
  @IsString()
  @IsNotEmpty()
  task_name: string;

  @ApiProperty({
    description: 'Unique task code',
    example: 'AS-WG-001',
  })
  @IsString()
  @IsNotEmpty()
  task_code: string;

  @ApiProperty({
    description: 'ID of the company this task belongs to',
    example: 1,
  })
  @IsInt()
  @Min(1)
  task_company_id: number;

  @ApiProperty({
    description: 'Task capacity in minutes',
    example: 30,
  })
  @IsInt()
  @Min(0)
  task_capacity_minutes: number;

  @ApiProperty({
    description: 'ID of the process this task belongs to (optional)',
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
  })
  @IsString()
  @IsNotEmpty()
  task_overview: string;

  @ApiProperty({
    description: 'Array of job IDs to link to this task (optional)',
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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTaskSkillDto)
  taskSkills?: CreateTaskSkillDto[];
}
