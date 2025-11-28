import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, MaxLength, MinLength } from 'class-validator';

export enum LevelName {
  NOVICE = 'NOVICE',
  INTERMEDIATE = 'INTERMEDIATE',
  PROFICIENT = 'PROFICIENT',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT',
}

export class CreateTaskSkillDto {
  @ApiProperty({
    description: 'Name of the skill',
    example: 'Soldering',
  })
  @IsString({ message: 'Skill name must be a string' })
  @IsNotEmpty({ message: 'Skill name is required' })
  @MinLength(2, { message: 'Skill name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Skill name cannot exceed 100 characters' })
  skill_name: string;

  @ApiProperty({
    description: 'Skill level',
    enum: LevelName,
    example: 'EXPERT',
  })
  @IsEnum(LevelName, { message: 'Level must be one of: NOVICE, INTERMEDIATE, PROFICIENT, ADVANCED, EXPERT' })
  level: LevelName;
}
