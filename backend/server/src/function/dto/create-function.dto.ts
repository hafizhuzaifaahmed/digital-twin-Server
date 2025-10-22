import { IsArray, IsHexColor, IsInt, IsNotEmpty, IsOptional, IsString, ArrayNotEmpty, ArrayUnique, MaxLength } from 'class-validator';

export class CreateFunctionDto {
  @IsString()
  @IsNotEmpty()
  functionCode: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsNotEmpty()
  company_id: number;

  @IsInt()
  @IsOptional()
  parent_function_id?: number;

  @IsHexColor()
  @IsOptional()
  backgroundColor?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @IsOptional()
  job_ids?: number[];

  @IsString()
  @MaxLength(10000)  // ~2000 words
  @IsOptional()
  overview?: string;
}
