import { IsInt, IsString, IsEmail, MinLength } from 'class-validator';
import { Match } from '../../common/validators/match.decorator';

export class CreateUser3dDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsInt()
  company_id!: number;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(6)
  @Match('password', { message: 'confirmPassword must match password' })
  confirmPassword!: string;

  @IsInt()
  created_by!: number;
}
