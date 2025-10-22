import { IsArray, IsInt, IsNumber, IsOptional, IsString, ArrayUnique, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { JobSkillInput } from './create-job.dto';

export class UpdateJobDto {
  @IsOptional()
  @IsString()
  jobCode?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  overview?: string;

  @IsOptional()
  @IsNumber()
  hourlyRate?: number;

  @IsOptional()
  @IsInt()
  maxHoursPerDay?: number;

  @IsOptional()
  @IsInt()
  company_id?: number;

  @IsOptional()
  @IsInt()
  function_id?: number;

  @IsOptional()
  @IsString()
  jobLevel?: string; // e.g., "ADVANCED"

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

  @ApiProperty({
    description: 'Optimistic concurrency guard. Pass the last known updatedAt ISO string of the job to avoid overwriting concurrent changes.',
    required: false,
    example: '2025-09-18T08:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  if_match_updated_at?: string;
}
