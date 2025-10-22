import { IsString, IsNotEmpty, IsEmail, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class CreatePeopleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  surname: string;

  @IsInt()
  @IsNotEmpty()
  company_id: number;

  @IsInt()
  @IsNotEmpty()
  job_id: number;

  @IsBoolean()
  @IsOptional()
  is_manager?: boolean = false;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
