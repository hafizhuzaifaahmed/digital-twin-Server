import { IsArray, IsHexColor, IsInt, IsOptional, IsString, ArrayUnique, MaxLength, MinLength, IsPositive } from 'class-validator';

export class UpdateFunctionDto {
  @IsString({ message: 'Function code must be a string' })
  @MinLength(2, { message: 'Function code must be at least 2 characters long' })
  @MaxLength(50, { message: 'Function code cannot exceed 50 characters' })
  @IsOptional()
  functionCode?: string;

  @IsString({ message: 'Function name must be a string' })
  @MinLength(2, { message: 'Function name must be at least 2 characters long' })
  @MaxLength(255, { message: 'Function name cannot exceed 255 characters' })
  @IsOptional()
  name?: string;

  @IsInt({ message: 'Company ID must be a valid integer' })
  @IsPositive({ message: 'Company ID must be a positive number' })
  @IsOptional()
  company_id?: number;

  @IsInt({ message: 'Parent function ID must be a valid integer' })
  @IsOptional()
  parent_function_id?: number;

  @IsHexColor({ message: 'Background color must be a valid hex color (e.g., #FF5733)' })
  @IsOptional()
  backgroundColor?: string;

  @IsArray({ message: 'Job IDs must be an array' })
  @ArrayUnique({ message: 'Job IDs must be unique' })
  @IsInt({ each: true, message: 'Each job ID must be a valid integer' })
  @IsOptional()
  job_ids?: number[];

  @IsString({ message: 'Overview must be a string' })
  @MaxLength(10000, { message: 'Overview cannot exceed 10000 characters' })
  @IsOptional()
  overview?: string;
}
