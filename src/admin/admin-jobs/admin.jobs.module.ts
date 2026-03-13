import { Module } from '@nestjs/common';
import { AdminJobsService } from './admin.jobs.service';
import { AdminJobsController } from './admin.jobs.controller';

@Module({
  controllers: [AdminJobsController],
  providers: [AdminJobsService],
})
export class AdminJobsModule {}
