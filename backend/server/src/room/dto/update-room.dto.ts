import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  roomCode?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  floor_id?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  row?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  column?: number;

  @IsOptional()
  @IsEnum(['EMPTY', 'ELEVATOR', 'STAIRS'])
  cellType?: 'EMPTY' | 'ELEVATOR' | 'STAIRS';
}
