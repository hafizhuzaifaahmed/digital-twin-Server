import { IsString, IsOptional, IsEmail, IsInt, IsBoolean } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreatePeopleDto } from './create-people.dto';

export class UpdatePeopleDto extends PartialType(CreatePeopleDto) {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  surname?: string;

  @IsOptional()
  @IsInt()
  job_id?: number;

  @IsOptional()
  @IsBoolean()
  is_manager?: boolean;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
