import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { IsIn, Max } from 'class-validator';

export class UpdateTableDto {
  @IsOptional()
  @IsString()
  tableCode?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  room_id?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  capacity?: number | null;

  @IsOptional()
  @IsIn(['HORIZONTAL', 'VERTICAL'])
  orientation?: 'HORIZONTAL' | 'VERTICAL' | null;
}
