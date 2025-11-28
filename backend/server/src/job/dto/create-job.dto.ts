import { IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, ArrayUnique, ValidateNested, MaxLength, MinLength, IsPositive, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateJobDto {
  @IsString({ message: 'Job code must be a string' })
  @IsNotEmpty({ message: 'Job code is required' })
  @MinLength(2, { message: 'Job code must be at least 2 characters long' })
  @MaxLength(50, { message: 'Job code cannot exceed 50 characters' })
  jobCode: string;

  @IsString({ message: 'Job name must be a string' })
  @IsNotEmpty({ message: 'Job name is required' })
  @MinLength(2, { message: 'Job name must be at least 2 characters long' })
  @MaxLength(255, { message: 'Job name cannot exceed 255 characters' })
  name: string;

  @IsString({ message: 'Description must be a string' })
  @IsNotEmpty({ message: 'Description is required' })
  @MinLength(10, { message: 'Description must be at least 10 characters long' })
  description: string;

  @IsOptional()
  @IsString({ message: 'Overview must be a string' })
  @MaxLength(10000, { message: 'Overview cannot exceed 10000 characters' })
  overview?: string;

  @IsNumber({}, { message: 'Hourly rate must be a valid number' })
  @Min(0, { message: 'Hourly rate cannot be negative' })
  hourlyRate: number;

  @IsInt({ message: 'Max hours per day must be a valid integer' })
  @Min(1, { message: 'Max hours per day must be at least 1' })
  @Max(24, { message: 'Max hours per day cannot exceed 24' })
  maxHoursPerDay: number;

  @IsInt({ message: 'Function ID must be a valid integer' })
  @IsPositive({ message: 'Function ID must be a positive number' })
  function_id: number;

  @IsInt({ message: 'Company ID must be a valid integer' })
  @IsPositive({ message: 'Company ID must be a positive number' })
  company_id: number;

  @IsString({ message: 'Job level must be a string' })
  @IsNotEmpty({ message: 'Job level is required' })
  @IsIn(['NOVICE', 'INTERMEDIATE', 'PROFICIENT', 'ADVANCED', 'EXPERT'], { 
    message: 'Job level must be one of: NOVICE, INTERMEDIATE, PROFICIENT, ADVANCED, EXPERT' 
  })
  jobLevel: string;

  // M:N relations
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
}

export class JobSkillInput {
  @IsString({ message: 'Skill name must be a string' })
  @IsNotEmpty({ message: 'Skill name is required' })
  @MinLength(2, { message: 'Skill name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Skill name cannot exceed 100 characters' })
  name: string;

  @IsString({ message: 'Skill level must be a string' })
  @IsNotEmpty({ message: 'Skill level is required' })
  @IsIn(['NOVICE', 'INTERMEDIATE', 'PROFICIENT', 'ADVANCED', 'EXPERT'], { 
    message: 'Skill level must be one of: NOVICE, INTERMEDIATE, PROFICIENT, ADVANCED, EXPERT' 
  })
  level: string;
}
