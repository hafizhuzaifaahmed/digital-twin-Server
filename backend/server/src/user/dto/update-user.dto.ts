import { IsInt, IsOptional, IsString, IsEmail, MinLength, ValidateIf } from 'class-validator';
import { Match } from '../../common/validators/match.decorator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  name?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string | null;

  @ValidateIf((o) => o.password != null)
  @IsString()
  @MinLength(6)
  @Match('password', { message: 'confirmPassword must match password' })
  confirmPassword?: string | null;

  @IsOptional()
  @IsInt()
  role_id?: number | null;

  @IsOptional()
  @IsInt()
  company_id?: number | null;
}
