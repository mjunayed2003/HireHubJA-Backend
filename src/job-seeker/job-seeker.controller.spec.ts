import { Test, TestingModule } from '@nestjs/testing';
import { JobSeekerController } from './job-seeker.controller';
import { JobSeekerService } from './job-seeker.service';

describe('JobSeekerController', () => {
  let controller: JobSeekerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobSeekerController],
      providers: [JobSeekerService],
    }).compile();

    controller = module.get<JobSeekerController>(JobSeekerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
