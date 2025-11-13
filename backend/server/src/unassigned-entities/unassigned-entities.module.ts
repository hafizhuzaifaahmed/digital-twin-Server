import { Module } from '@nestjs/common';
import { UnassignedEntitiesService } from './unassigned-entities.service';
import { UnassignedEntitiesController } from './unassigned-entities.controller';

@Module({
  controllers: [UnassignedEntitiesController],
  providers: [UnassignedEntitiesService],
})
export class UnassignedEntitiesModule {}
