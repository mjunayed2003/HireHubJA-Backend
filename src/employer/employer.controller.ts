import { Body, Controller, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { EmployerService } from './employer.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateJobDto, ScheduleInterviewDto, UpdateApplicationStatusDto } from './dto/employer.dto';

@UseGuards(JwtAuthGuard)
@Controller(' ')
export class EmployerController {
  constructor(private readonly employerService: EmployerService) {}

  // 1. Dashboard Stats
  // URL: GET /employer/dashboard
  @Get('dashboard')
  async getDashboardStats(@Request() req) {
    return this.employerService.getDashboardStats(req.user.id);
  }

  // 2. Post a Job
  // URL: POST /employer/jobs
  @Post('jobs')
  async createJob(@Request() req, @Body() dto: CreateJobDto) {
    return this.employerService.createJob(req.user.id, dto);
  }

  // 3. My Jobs List
  // URL: GET /employer/jobs
  @Get('jobs')
  async getMyJobs(@Request() req) {
    return this.employerService.getMyJobs(req.user.id);
  }

  // 4. View Applicants for a specific Job
  // URL: GET /employer/jobs/:jobId/applicants
  @Get('jobs/:jobId/applicants')
  async getJobApplicants(@Request() req, @Param('jobId') jobId: string) {
    return this.employerService.getJobApplicants(req.user.id, jobId);
  }

  // 5. Single Applicant Details (Resume & Profile)
  // URL: GET /employer/application/:appId
  @Get('application/:appId')
  async getApplicantDetails(@Param('appId') appId: string) {
    return this.employerService.getApplicantDetails(appId);
  }

  // 6. Schedule Interview
  // URL: POST /employer/application/:appId/interview
  @Post('application/:appId/interview')
  async scheduleInterview(
    @Request() req, 
    @Param('appId') appId: string, 
    @Body() dto: ScheduleInterviewDto
  ) {
    return this.employerService.scheduleInterview(req.user.id, appId, dto);
  }

  // 7. Get All Scheduled Interviews (For "Interview Scheduled" Page)
  // URL: GET /employer/interviews
  @Get('interviews')
  async getAllInterviews(@Request() req) {
    return this.employerService.getAllInterviews(req.user.id);
  }

  // 8. Update Status (Hire / Reject)
  // URL: PUT /employer/application/:appId/status
  @Put('application/:appId/status')
  async updateApplicationStatus(
    @Param('appId') appId: string, 
    @Body() dto: UpdateApplicationStatusDto
  ) {
    return this.employerService.updateApplicationStatus(appId, dto);
  }
}