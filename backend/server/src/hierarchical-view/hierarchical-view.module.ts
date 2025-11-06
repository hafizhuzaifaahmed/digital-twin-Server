import { Module } from '@nestjs/common';
import { HierarchicalViewService } from './hierarchical-view.service';
import { HierarchicalViewController } from './hierarchical-view.controller';

@Module({
  controllers: [HierarchicalViewController],
  providers: [HierarchicalViewService],
})
export class HierarchicalViewModule {}
