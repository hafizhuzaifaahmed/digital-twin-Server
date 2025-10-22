import { IsInt, IsOptional, IsString, Min, Max, IsNotEmpty, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum CellTypeDto {
  EMPTY = 'EMPTY',
  ELEVATOR = 'ELEVATOR',
  STAIRS = 'STAIRS',
}

export class BuildingCellDto {
  @IsInt()
  @Min(1)
  row!: number;

  @IsInt()
  @Min(1)
  column!: number;

  @IsEnum(CellTypeDto)
  type!: CellTypeDto;
}

export class CreateBuildingDto {
  @IsString()
  @IsNotEmpty()
  buildingCode!: string;

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
