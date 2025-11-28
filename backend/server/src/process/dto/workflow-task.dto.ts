import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, Min } from 'class-validator';

export class WorkflowTaskDto {
  @ApiProperty({
    description: 'Task ID to include in the workflow (mutually exclusive with child_process_id)',
    example: 1,
    required: false,
  })
  @IsInt({ message: 'Task ID must be a valid integer' })
  @IsPositive({ message: 'Task ID must be a positive number' })
  @IsOptional()
  task_id?: number;

  @ApiProperty({
    description: 'Child Process ID to include in the workflow (mutually exclusive with task_id)',
    example: 2,
    required: false,
  })
  @IsInt({ message: 'Child Process ID must be a valid integer' })
  @IsPositive({ message: 'Child Process ID must be a positive number' })
  @IsOptional()
  child_process_id?: number;

  @ApiProperty({
    description: 'Job ID to assign to this task in the workflow',
    example: 10,
  })
  @IsInt({ message: 'Job ID must be a valid integer' })
  @IsPositive({ message: 'Job ID must be a positive number' })
  job_id: number;

  @ApiProperty({
    description: 'Order/sequence of the task in the workflow (1-based)',
    example: 1,
    minimum: 1,
  })
  @IsInt({ message: 'Order must be a valid integer' })
  @Min(1, { message: 'Order must be at least 1' })
  order: number;
}
