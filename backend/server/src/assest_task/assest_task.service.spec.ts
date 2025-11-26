import { Test, TestingModule } from '@nestjs/testing';
import { AssestTaskService } from './assest_task.service';

describe('AssestTaskService', () => {
  let service: AssestTaskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssestTaskService],
    }).compile();

    service = module.get<AssestTaskService>(AssestTaskService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
