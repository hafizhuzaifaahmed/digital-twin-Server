import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { skill_level_level_name } from '@prisma/client';

export class TaskSkillDto {
  @IsString()
  @IsNotEmpty()
  skill_name: string;

  @IsEnum(skill_level_level_name)
  required_level: skill_level_level_name;

  // Optional: Add skill description for new skills
  @IsString()
  @IsOptional()
  skill_description?: string;

  // Optional: Add level description for reference
  @IsString()
  @IsOptional()
  level_description?: string;
}
