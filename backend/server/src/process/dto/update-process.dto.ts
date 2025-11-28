import { PartialType } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsISO8601 } from 'class-validator';
import { CreateProcessDto } from './create-process.dto';

export class UpdateProcessDto extends PartialType(CreateProcessDto) {
  @ApiProperty({
    description: 'Optimistic concurrency guard. Pass the last known updated_at ISO string of the process to avoid overwriting concurrent changes.',
    required: false,
    example: '2025-09-18T08:00:00.000Z',
  })
  @IsOptional()
  @IsString({ message: 'if_match_updated_at must be a string' })
  @IsISO8601({}, { message: 'if_match_updated_at must be a valid ISO 8601 date string (e.g., 2025-09-18T08:00:00.000Z)' })
  if_match_updated_at?: string;
}
