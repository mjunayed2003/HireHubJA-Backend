import { Test, TestingModule } from '@nestjs/testing';
import { AdminUsersController } from './admin.users.controller';
import { AdminUsersService } from './admin.users.service';

describe('AdminUsersController', () => {
  let controller: AdminUsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUsersController],
      providers: [AdminUsersService],
    }).compile();

    controller = module.get<AdminUsersController>(AdminUsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
