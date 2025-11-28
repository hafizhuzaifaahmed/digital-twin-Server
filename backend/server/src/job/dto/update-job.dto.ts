import { IsArray, IsInt, IsNumber, IsOptional, IsString, ArrayUnique, ValidateNested, MaxLength, MinLength, Min, Max, IsPositive, IsIn, IsISO8601 } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { JobSkillInput } from './create-job.dto';

export class UpdateJobDto {
  @IsOptional()
  @IsString({ message: 'Job code must be a string' })
  @MinLength(2, { message: 'Job code must be at least 2 characters long' })
  @MaxLength(50, { message: 'Job code cannot exceed 50 characters' })
  jobCode?: string;

  @IsOptional()
  @IsString({ message: 'Job name must be a string' })
  @MinLength(2, { message: 'Job name must be at least 2 characters long' })
  @MaxLength(255, { message: 'Job name cannot exceed 255 characters' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MinLength(10, { message: 'Description must be at least 10 characters long' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'Overview must be a string' })
  @MaxLength(10000, { message: 'Overview cannot exceed 10000 characters' })
  overview?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Hourly rate must be a valid number' })
  @Min(0, { message: 'Hourly rate cannot be negative' })
  hourlyRate?: number;

  @IsOptional()
  @IsInt({ message: 'Max hours per day must be a valid integer' })
  @Min(1, { message: 'Max hours per day must be at least 1' })
  @Max(24, { message: 'Max hours per day cannot exceed 24' })
  maxHoursPerDay?: number;

  @IsOptional()
  @IsInt({ message: 'Company ID must be a valid integer' })
  @IsPositive({ message: 'Company ID must be a positive number' })
  company_id?: number;

  @IsOptional()
  @IsInt({ message: 'Function ID must be a valid integer' })
  @IsPositive({ message: 'Function ID must be a positive number' })
  function_id?: number;

  @IsOptional()
  @IsString({ message: 'Job level must be a string' })
  @IsIn(['NOVICE', 'INTERMEDIATE', 'PROFICIENT', 'ADVANCED', 'EXPERT'], { 
    message: 'Job level must be one of: NOVICE, INTERMEDIATE, PROFICIENT, ADVANCED, EXPERT' 
  })
  jobLevel?: string;

  @IsOptional()
  @IsArray({ message: 'Task IDs must be an array' })
  @ArrayUnique({ message: 'Task IDs must be unique' })
  @IsInt({ each: true, message: 'Each task ID must be a valid integer' })
  task_ids?: number[];

  @IsOptional()
  @IsArray({ message: 'Skills must be an array' })
  @ValidateNested({ each: true, message: 'Each skill must be a valid skill object' })
  @Type(() => JobSkillInput)
  skills?: JobSkillInput[];

  @ApiProperty({
    description: 'Optimistic concurrency guard. Pass the last known updatedAt ISO string of the job to avoid overwriting concurrent changes.',
    required: false,
    example: '2025-09-18T08:00:00.000Z',
  })
  @IsOptional()
  @IsString({ message: 'if_match_updated_at must be a string' })
  @IsISO8601({}, { message: 'if_match_updated_at must be a valid ISO 8601 date string (e.g., 2025-09-18T08:00:00.000Z)' })
  if_match_updated_at?: string;
}
