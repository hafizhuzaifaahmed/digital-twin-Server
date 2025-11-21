import { Test, TestingModule } from '@nestjs/testing';
import { UnassignedEntitiesService } from './unassigned-entities.service';

describe('UnassignedEntitiesService', () => {
  let service: UnassignedEntitiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UnassignedEntitiesService],
    }).compile();

    service = module.get<UnassignedEntitiesService>(UnassignedEntitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
