import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JobSeekerService } from './job-seeker.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ApplyJobDto, ReportJobDto } from './dto/job-action.dto';

@Controller('jobs')
export class JobSeekerController {
  constructor(private readonly jobSeekerService: JobSeekerService) {}

  // 1. Public: all jobe see  (Home Page)
  // URL: GET /jobs?search=developer&location=dhaka
  @Get()
  async getAllJobs(@Query() query) {
    return this.jobSeekerService.getAllJobs(query);
  }

  // 2. Protected: show job details
  // URL: GET /jobs/:id/details
  @UseGuards(JwtAuthGuard)
  @Get(':id/details')
  async getJobDetails(@Param('id') id: string, @Request() req) {
    return this.jobSeekerService.getJobDetails(id, req.user.id);
  }

  // 3. Apply Job
  // URL: POST /jobs/apply
  @UseGuards(JwtAuthGuard)
  @Post('apply')
  async applyJob(@Body() dto: ApplyJobDto, @Request() req) {
    return this.jobSeekerService.applyJob(req.user.id, dto);
  }

  // 4. Bookmark (Save/Unsave)
  // URL: POST /jobs/:id/bookmark
  @UseGuards(JwtAuthGuard)
  @Post(':id/bookmark')
  async toggleBookmark(@Param('id') jobId: string, @Request() req) {
    return this.jobSeekerService.toggleBookmark(req.user.id, jobId);
  }

  // bookmarked job list
  // URL: GET /jobs/my-bookmarks
  @UseGuards(JwtAuthGuard)
  @Get('my-bookmarks')
  async getBookmarkedJobs(@Request() req) {
    return this.jobSeekerService.getBookmarkedJobs(req.user.id);
  }

  // 5. Track Applications (UI: Track My Job)
  // URL: GET /jobs/my-applications
  @UseGuards(JwtAuthGuard)
  @Get('my-applications')
  async getMyApplications(@Request() req) {
    return this.jobSeekerService.getMyApplications(req.user.id);
  }

  // 6. Report a Job
  // URL: POST /jobs/report
  @UseGuards(JwtAuthGuard)
  @Post('report')
  async reportJob(@Body() dto: ReportJobDto, @Request() req) {
    return this.jobSeekerService.reportJob(req.user.id, dto);
  }
}