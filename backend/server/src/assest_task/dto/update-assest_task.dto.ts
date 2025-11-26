import { PartialType } from '@nestjs/swagger';
import { CreateAssestTaskDto } from './create-assest_task.dto';

export class UpdateAssestTaskDto extends PartialType(CreateAssestTaskDto) {}
