import { Module } from '@nestjs/common';
import { UnassignedEntitiesService } from './unassigned-entities.service';
import { UnassignedEntitiesController } from './unassigned-entities.controller';
import { HierarchicalViewModule } from '../hierarchical-view/hierarchical-view.module';

@Module({
  controllers: [UnassignedEntitiesController],
  providers: [UnassignedEntitiesService],
  imports: [HierarchicalViewModule]
})
export class UnassignedEntitiesModule { }
