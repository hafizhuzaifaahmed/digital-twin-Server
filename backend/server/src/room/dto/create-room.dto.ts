import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  roomCode: string;

  @IsString()
  name: string;

  @IsInt()
  floor_id: number;

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
