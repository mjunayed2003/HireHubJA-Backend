import { Module } from '@nestjs/common';
import { JobSeekerController } from './job-seeker.controller';
import { JobSeekerService } from './job-seeker.service';
import { NotificationModule } from '../notification/notification.module';
import { RolesGuard } from 'src/auth/roles.guard';
import { PublicJobController } from './public-job.controller';

@Module({
  imports: [NotificationModule],
  controllers: [JobSeekerController, PublicJobController],
  providers: [JobSeekerService, RolesGuard],
})
export class JobSeekerModule {}