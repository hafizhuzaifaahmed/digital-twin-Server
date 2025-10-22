import { IsInt, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class CreateFloorDto {
  @IsString()
  @IsNotEmpty()
  floorCode!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  building_id!: number;
}
