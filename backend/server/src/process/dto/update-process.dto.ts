import { PartialType } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateProcessDto } from './create-process.dto';

export class UpdateProcessDto extends PartialType(CreateProcessDto) {
  @ApiProperty({
    description: 'Optimistic concurrency guard. Pass the last known updated_at ISO string of the process to avoid overwriting concurrent changes.',
    required: false,
    example: '2025-09-18T08:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  if_match_updated_at?: string;
}
