import { Test, TestingModule } from '@nestjs/testing';
import { HierarchicalViewController } from './hierarchical-view.controller';
import { HierarchicalViewService } from './hierarchical-view.service';

describe('HierarchicalViewController', () => {
  let controller: HierarchicalViewController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HierarchicalViewController],
      providers: [HierarchicalViewService],
    }).compile();

    controller = module.get<HierarchicalViewController>(HierarchicalViewController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
