import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

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
  @IsString()
  @IsNotEmpty()
  skill_name: string;

  @ApiProperty({
    description: 'Skill level',
    enum: LevelName,
    example: 'EXPERT',
  })
  @IsEnum(LevelName)
  level: LevelName;
}
