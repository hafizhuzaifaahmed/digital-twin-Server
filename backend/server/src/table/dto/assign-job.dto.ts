import { IsInt } from 'class-validator';

export class AssignJobDto {
  @IsInt()
  job_id!: number;
}
