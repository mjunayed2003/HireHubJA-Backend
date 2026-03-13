import { Test, TestingModule } from '@nestjs/testing';
import { AdminJobsController } from './admin.jobs.controller';
import { AdminJobsService } from './admin.jobs.service';

describe('AdminJobsController', () => {
  let controller: AdminJobsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminJobsController],
      providers: [AdminJobsService],
    }).compile();

    controller = module.get<AdminJobsController>(AdminJobsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
