import { IsInt, IsOptional, IsString, IsEmail, MinLength, ValidateIf } from 'class-validator';
import { Match } from '../../common/validators/match.decorator';

export class UpdateUser3dDto {
  @IsOptional()
  @IsString()
  name?: string | null;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsInt()
  company_id?: number | null;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string | null;

  @ValidateIf((o) => o.password != null)
  @IsString()
  @MinLength(6)
  @Match('password', { message: 'confirmPassword must match password' })
  confirmPassword?: string | null;

  @IsInt()
  updated_by!: number;
}
