import { Test, TestingModule } from '@nestjs/testing';
import { AssestTaskController } from './assest_task.controller';
import { AssestTaskService } from './assest_task.service';

describe('AssestTaskController', () => {
  let controller: AssestTaskController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssestTaskController],
      providers: [AssestTaskService],
    }).compile();

    controller = module.get<AssestTaskController>(AssestTaskController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
