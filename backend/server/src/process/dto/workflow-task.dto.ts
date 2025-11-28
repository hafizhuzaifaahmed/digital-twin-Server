import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, Min } from 'class-validator';

export class WorkflowTaskDto {
  @ApiProperty({
    description: 'Task ID to include in the workflow (mutually exclusive with child_process_id)',
    example: 1,
    required: false,
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  task_id?: number;

  @ApiProperty({
    description: 'Child Process ID to include in the workflow (mutually exclusive with task_id)',
    example: 2,
    required: false,
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  child_process_id?: number;

  @ApiProperty({
    description: 'Job ID to assign to this task in the workflow',
    example: 10,
  })
  @IsInt()
  @IsPositive()
  job_id: number;

  @ApiProperty({
    description: 'Order/sequence of the task in the workflow (1-based)',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  order: number;
}
