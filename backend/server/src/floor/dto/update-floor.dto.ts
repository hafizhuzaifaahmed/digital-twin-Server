import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateFloorDto {
  @IsOptional()
  @IsString()
  floorCode?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  building_id?: number | null;
}
