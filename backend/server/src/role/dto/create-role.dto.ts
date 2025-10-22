import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
