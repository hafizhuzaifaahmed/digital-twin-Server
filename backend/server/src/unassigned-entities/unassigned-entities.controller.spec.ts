import { Test, TestingModule } from '@nestjs/testing';
import { UnassignedEntitiesController } from './unassigned-entities.controller';
import { UnassignedEntitiesService } from './unassigned-entities.service';

describe('UnassignedEntitiesController', () => {
  let controller: UnassignedEntitiesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UnassignedEntitiesController],
      providers: [UnassignedEntitiesService],
    }).compile();

    controller = module.get<UnassignedEntitiesController>(UnassignedEntitiesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
