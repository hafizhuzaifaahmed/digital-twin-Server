import { IsString, IsOptional } from 'class-validator';

export class UpdateSkillDto {
  @IsOptional()
  @IsString()
  name?: string;
}
