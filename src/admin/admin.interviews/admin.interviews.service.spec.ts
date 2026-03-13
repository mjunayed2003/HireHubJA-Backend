import { Test, TestingModule } from '@nestjs/testing';
import { AdminInterviewsService } from './admin.interviews.service';

describe('AdminInterviewsService', () => {
  let service: AdminInterviewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminInterviewsService],
    }).compile();

    service = module.get<AdminInterviewsService>(AdminInterviewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
