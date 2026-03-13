import { Test, TestingModule } from '@nestjs/testing';
import { AdminInterviewsController } from './admin.interviews.controller';
import { AdminInterviewsService } from './admin.interviews.service';

describe('AdminInterviewsController', () => {
  let controller: AdminInterviewsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminInterviewsController],
      providers: [AdminInterviewsService],
    }).compile();

    controller = module.get<AdminInterviewsController>(AdminInterviewsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
