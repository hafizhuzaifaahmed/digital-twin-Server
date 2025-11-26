import { Module } from '@nestjs/common';
import { AssestTaskService } from './assest_task.service';
import { AssestTaskController } from './assest_task.controller';

@Module({
  controllers: [AssestTaskController],
  providers: [AssestTaskService],
})
export class AssestTaskModule {}
