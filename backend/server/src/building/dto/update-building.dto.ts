import { IsInt, IsOptional, IsString, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BuildingCellDto } from './create-building.dto';

export class UpdateBuildingDto {
  @IsOptional()
  @IsString()
  buildingCode?: string | null;

  @IsOptional()
  @IsString()
  name?: string | null;

  @IsOptional()
  @IsInt()
  company_id?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rows?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  columns?: number | null;

  @IsOptional()
  @IsString()
  country?: string | null;

  @IsOptional()
  @IsString()
  city?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BuildingCellDto)
  layout?: BuildingCellDto[] | null;
}
