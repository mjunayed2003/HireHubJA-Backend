import {
  Body, Controller, Delete, Get, Param,
  Post, Put, Request, UploadedFiles,
  UseGuards, UseInterceptors
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { EmployerService } from './employer.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import {
  CreateJobDto, ScheduleInterviewDto,
  UpdateApplicationStatusDto
} from './dto/employer.dto';
import { UpdateEmployerProfileDto, ChangePasswordDto } from './dto/employer-profile.dto';

@UseGuards(JwtAuthGuard)
@Controller('employer')
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

  // 5. Single Applicant Details
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

  // 7. Get All Interviews
  // URL: GET /employer/interviews
  @Get('interviews')
  async getAllInterviews(@Request() req) {
    return this.employerService.getAllInterviews(req.user.id);
  }

  // 8. Update Application Status
  // URL: PUT /employer/application/:appId/status
  @Put('application/:appId/status')
  async updateApplicationStatus(
    @Param('appId') appId: string,
    @Body() dto: UpdateApplicationStatusDto
  ) {
    return this.employerService.updateApplicationStatus(appId, dto);
  }

  // 9. Update Interview
  // URL: PUT /employer/interview/:interviewId
  @Put('interview/:interviewId')
  async updateInterview(
    @Param('interviewId') interviewId: string,
    @Body() dto: ScheduleInterviewDto,
  ) {
    return this.employerService.updateInterview(interviewId, dto);
  }

  // ==================================================
  // PROFILE ROUTES
  // ==================================================

  // 10. GET PROFILE
  // URL: GET /employer/profile
  @Get('profile')
  async getProfile(@Request() req) {
    return this.employerService.getProfile(req.user.id);
  }

  // 11. UPDATE PROFILE
  // URL: PUT /employer/profile
  @Put('profile')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'profilePic', maxCount: 1 },
      { name: 'licenseFile', maxCount: 1 },
    ], {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async updateProfile(
    @Body() dto: UpdateEmployerProfileDto,
    @UploadedFiles() files: {
      profilePic?: Express.Multer.File[];
      licenseFile?: Express.Multer.File[];
    },
    @Request() req,
  ) {
    const profilePic = files?.profilePic?.[0]
      ? `/uploads/${files.profilePic[0].filename}`
      : null;
    const licenseFile = files?.licenseFile?.[0]
      ? `/uploads/${files.licenseFile[0].filename}`
      : null;
    return this.employerService.updateProfile(req.user.id, dto, profilePic, licenseFile);
  }

  // 12. CHANGE PASSWORD
  // URL: POST /employer/change-password
  @Post('change-password')
  async changePassword(@Body() dto: ChangePasswordDto, @Request() req) {
    return this.employerService.changePassword(req.user.id, dto);
  }

  // 13. SYSTEM CONTENT
  // URL: GET /employer/content/:key
  @Get('content/:key')
  async getSystemContent(@Param('key') key: string) {
    return this.employerService.getSystemContent(key);
  }

  // 14. DELETE ACCOUNT
  // URL: DELETE /employer/account
  @Delete('account')
  async deleteAccount(@Request() req) {
    return this.employerService.deleteAccount(req.user.id);
  }
}