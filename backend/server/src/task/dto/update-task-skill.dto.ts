import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { LevelName } from './create-task-skill.dto';

export class UpdateTaskSkillDto {
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
