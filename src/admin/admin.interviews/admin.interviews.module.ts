import { Module } from '@nestjs/common';
import { AdminInterviewsService } from './admin.interviews.service';
import { AdminInterviewsController } from './admin.interviews.controller';

@Module({
  controllers: [AdminInterviewsController],
  providers: [AdminInterviewsService],
})
export class AdminInterviewsModule {}
