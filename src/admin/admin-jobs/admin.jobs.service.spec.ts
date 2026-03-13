import { Test, TestingModule } from '@nestjs/testing';
import { AdminJobsService } from './admin.jobs.service';

describe('AdminJobsService', () => {
  let service: AdminJobsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminJobsService],
    }).compile();

    service = module.get<AdminJobsService>(AdminJobsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
