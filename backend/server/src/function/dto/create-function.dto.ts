import { IsArray, IsHexColor, IsInt, IsNotEmpty, IsOptional, IsString, ArrayNotEmpty, ArrayUnique, MaxLength, MinLength, IsPositive } from 'class-validator';

export class CreateFunctionDto {
  @IsString({ message: 'Function code must be a string' })
  @IsNotEmpty({ message: 'Function code is required' })
  @MinLength(2, { message: 'Function code must be at least 2 characters long' })
  @MaxLength(50, { message: 'Function code cannot exceed 50 characters' })
  functionCode: string;

  @IsString({ message: 'Function name must be a string' })
  @IsNotEmpty({ message: 'Function name is required' })
  @MinLength(2, { message: 'Function name must be at least 2 characters long' })
  @MaxLength(255, { message: 'Function name cannot exceed 255 characters' })
  name: string;

  @IsInt({ message: 'Company ID must be a valid integer' })
  @IsPositive({ message: 'Company ID must be a positive number' })
  company_id: number;

  @IsInt({ message: 'Parent function ID must be a valid integer' })
  @IsPositive({ message: 'Parent function ID must be a positive number' })
  @IsOptional()
  parent_function_id?: number;

  @IsHexColor({ message: 'Background color must be a valid hex color (e.g., #FF5733)' })
  @IsOptional()
  backgroundColor?: string;

  @IsArray({ message: 'Job IDs must be an array' })
  @ArrayNotEmpty({ message: 'Job IDs array cannot be empty if provided' })
  @ArrayUnique({ message: 'Job IDs must be unique' })
  @IsInt({ each: true, message: 'Each job ID must be a valid integer' })
  @IsOptional()
  job_ids?: number[];

  @IsString({ message: 'Overview must be a string' })
  @MaxLength(10000, { message: 'Overview cannot exceed 10000 characters' })
  @IsOptional()
  overview?: string;
}
