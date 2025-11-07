import { Test, TestingModule } from '@nestjs/testing';
import { HierarchicalViewService } from './hierarchical-view.service';

describe('HierarchicalViewService', () => {
  let service: HierarchicalViewService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HierarchicalViewService],
    }).compile();

    service = module.get<HierarchicalViewService>(HierarchicalViewService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
