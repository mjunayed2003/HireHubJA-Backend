// src/public-job/public-job.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { JobSeekerService } from 'src/job-seeker/job-seeker.service';

@Controller('jobs')
export class PublicJobController {
  constructor(private readonly jobSeekerService: JobSeekerService) {}

  @Get()
  async getAllJobs(@Query() query) {
    return this.jobSeekerService.getAllJobs(query);
  }
}