import {
  Body, Controller, Delete, Get, Param, Post, Put,
  Query, Request, UploadedFile, UploadedFiles,
  UseGuards, UseInterceptors
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JobSeekerService } from './job-seeker.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ApplyJobDto, ReportJobDto } from './dto/job-action.dto';
import { ChangePasswordDto, UpdateProfileDto } from './dto/profile.dto';

@Controller('jobs')
export class JobSeekerController {
  constructor(private readonly jobSeekerService: JobSeekerService) {}

  // ✅ Static routes আগে
  @UseGuards(JwtAuthGuard)
  @Get('my-bookmarks')
  async getBookmarkedJobs(@Request() req) {
    return this.jobSeekerService.getBookmarkedJobs(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-applications')
  async getMyApplications(@Request() req) {
    return this.jobSeekerService.getMyApplications(req.user.id);
  }

  // ✅ Dynamic routes পরে
  @Get()
  async getAllJobs(@Query() query) {
    return this.jobSeekerService.getAllJobs(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/details')
  async getJobDetails(@Param('id') id: string, @Request() req) {
    return this.jobSeekerService.getJobDetails(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('apply')
  @UseInterceptors(
    FileInterceptor('resume', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `resume-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(pdf|doc|docx)$/)) {
          return cb(new Error('Only PDF and DOC files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async applyJob(
    @Body() dto: ApplyJobDto,
    @UploadedFile() resume: Express.Multer.File,
    @Request() req,
  ) {
    const resumeUrl = resume ? `/uploads/${resume.filename}` : dto.resumeUrl ?? null;
    return this.jobSeekerService.applyJob(req.user.id, dto, resumeUrl);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/bookmark')
  async toggleBookmark(@Param('id') jobId: string, @Request() req) {
    return this.jobSeekerService.toggleBookmark(req.user.id, jobId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('report')
  async reportJob(@Body() dto: ReportJobDto, @Request() req) {
    return this.jobSeekerService.reportJob(req.user.id, dto);
  }

  // ==================================================
  // PROFILE ROUTES
  // ==================================================

  // 1. GET PROFILE
  // URL: GET /jobs/profile
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return this.jobSeekerService.getProfile(req.user.id);
  }

  // 2. UPDATE PROFILE
  // URL: PUT /jobs/profile
  @UseGuards(JwtAuthGuard)
  @Put('profile')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'profilePic', maxCount: 1 },
      { name: 'resume', maxCount: 1 },
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
    @Body() dto: UpdateProfileDto,
    @UploadedFiles() files: {
      profilePic?: Express.Multer.File[];
      resume?: Express.Multer.File[];
    },
    @Request() req,
  ) {
    const profilePic = files?.profilePic?.[0]
      ? `/uploads/${files.profilePic[0].filename}`
      : null;
    const resumeUrl = files?.resume?.[0]
      ? `/uploads/${files.resume[0].filename}`
      : null;
    return this.jobSeekerService.updateProfile(req.user.id, dto, profilePic, resumeUrl);
  }

  // 3. CHANGE PASSWORD
  // URL: POST /jobs/change-password
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Body() dto: ChangePasswordDto, @Request() req) {
    return this.jobSeekerService.changePassword(req.user.id, dto);
  }

  // 4. DELETE ACCOUNT
  // URL: DELETE /jobs/account
  @UseGuards(JwtAuthGuard)
  @Delete('account')
  async deleteAccount(@Request() req) {
    return this.jobSeekerService.deleteAccount(req.user.id);
  }
}