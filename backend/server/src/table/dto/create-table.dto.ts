import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { IsIn, Max } from 'class-validator';

export class CreateTableDto {
  @IsString()
  tableCode!: string;

  @IsString()
  name!: string;

  @IsInt()
  room_id!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  capacity?: number;

  @IsOptional()
  @IsIn(['HORIZONTAL', 'VERTICAL'])
  orientation?: 'HORIZONTAL' | 'VERTICAL';
}
