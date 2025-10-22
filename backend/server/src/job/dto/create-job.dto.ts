import { IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, ArrayUnique, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  jobCode: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  overview?: string;

  @IsNumber()
  hourlyRate: number;

  @IsInt()
  maxHoursPerDay: number;

  @IsInt()
  function_id: number;

  @IsInt()
  company_id: number;

  @IsString()
  @IsNotEmpty()
  jobLevel: string; // e.g., "ADVANCED"

  // M:N relations
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  task_ids?: number[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobSkillInput)
  skills?: JobSkillInput[];
}

export class JobSkillInput {
  @IsString()
  name: string; // skill name

  @IsString()
  level: string; // e.g., "PROFICIENT"
}
