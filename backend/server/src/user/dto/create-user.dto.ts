import { IsInt, IsOptional, IsString, IsEmail, MinLength, ValidateIf } from 'class-validator';
import { Match } from '../../common/validators/match.decorator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  name!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(6)
  @Match('password', { message: 'confirmPassword must match password' })
  confirmPassword!: string;

  @IsInt()
  role_id!: number;

  @IsOptional()
  @IsInt()
  company_id?: number | null;
}
