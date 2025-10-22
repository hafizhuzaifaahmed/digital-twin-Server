import { IsArray, IsHexColor, IsInt, IsOptional, IsString, ArrayUnique, MaxLength } from 'class-validator';

export class UpdateFunctionDto {
  @IsString()
  @IsOptional()
  functionCode?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @IsOptional()
  company_id?: number;

  @IsInt()
  @IsOptional()
  parent_function_id?: number;

  @IsHexColor()
  @IsOptional()
  backgroundColor?: string;

  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @IsOptional()
  job_ids?: number[];

  @IsString()
  @MaxLength(10000)  // ~2000 words
  @IsOptional()
  overview?: string;
}
