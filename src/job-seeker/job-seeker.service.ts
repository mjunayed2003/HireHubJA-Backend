import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApplyJobDto, ReportJobDto } from './dto/job-action.dto';

@Injectable()
export class JobSeekerService {
  constructor(private prisma: PrismaService) {}

  // ==================================================
  // 1. HOME & SEARCH
  // ==================================================
  async getAllJobs(query: any) {
    const { search, location, categoryId, type } = query;

    return this.prisma.job.findMany({
      where: {
        status: 'OPEN',
        AND: [
          search ? { title: { contains: search, mode: 'insensitive' } } : {},
          location ? { location: { contains: location, mode: 'insensitive' } } : {},
          categoryId ? { categoryId: categoryId } : {},
        ],
      },
      include: {
        employer: { select: { companyName: true, profilePic: true } },
        category: true,
      },
      orderBy: { createdAt: 'desc' }, 
    });
  }

  // ==================================================
  // 2. JOB DETAILS
  // ==================================================
  async getJobDetails(jobId: string, userId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        employer: true,
        category: true,
      },
    });

    if (!job) throw new NotFoundException('Job not found');

    // check if the user has already applied or bookmarked this job
    const hasApplied = await this.prisma.application.findUnique({
      where: {
        jobId_jobSeekerId: { // Composite Key
          jobId: jobId,
          jobSeekerId: await this.getProfileId(userId),
        },
      },
    });

    const isBookmarked = await this.prisma.savedJob.findUnique({
      where: {
        jobId_jobSeekerId: {
          jobId: jobId,
          jobSeekerId: await this.getProfileId(userId),
        },
      },
    });

    return {
      ...job,
      hasApplied: !!hasApplied, // true/false
      isBookmarked: !!isBookmarked, // true/false
    };
  }

  // ==================================================
  // 3. APPLY JOB 
  // ==================================================
  async applyJob(userId: string, dto: ApplyJobDto) {
    const profileId = await this.getProfileId(userId);

    // chek if already applied
    const existingApp = await this.prisma.application.findUnique({
      where: {
        jobId_jobSeekerId: { jobId: dto.jobId, jobSeekerId: profileId },
      },
    });

    if (existingApp) throw new BadRequestException('You have already applied to this job!');

    // make application
    return this.prisma.application.create({
      data: {
        jobId: dto.jobId,
        jobSeekerId: profileId,
        status: 'APPLIED',
      },
    });
  }

  // ==================================================
  // 4. BOOKMARK / SAVE JOB (Toggle)
  // ==================================================
  async toggleBookmark(userId: string, jobId: string) {
    const profileId = await this.getProfileId(userId);

    // check if already saved
    const existing = await this.prisma.savedJob.findUnique({
      where: {
        jobId_jobSeekerId: { jobId, jobSeekerId: profileId },
      },
    });

    if (existing) {
      // if exists, delete it (Unsave)
      await this.prisma.savedJob.delete({ where: { id: existing.id } });
      return { message: 'Job removed from bookmarks', isBookmarked: false };
    } else {
      // if not exists
      await this.prisma.savedJob.create({
        data: { jobId, jobSeekerId: profileId },
      });
      return { message: 'Job bookmarked successfully', isBookmarked: true };
    }
  }

  // see saved jobs
  async getBookmarkedJobs(userId: string) {
    const profileId = await this.getProfileId(userId);
    return this.prisma.savedJob.findMany({
      where: { jobSeekerId: profileId },
      include: {
        job: {
          include: { employer: true, category: true },
        },
      },
    });
  }

  // ==================================================
  // 5. TRACK APPLICATIONS (UI: Track My Job)
  // ==================================================
  async getMyApplications(userId: string) {
    const profileId = await this.getProfileId(userId);
    
    return this.prisma.application.findMany({
      where: { jobSeekerId: profileId },
      include: {
        job: {
          include: { employer: true },
        },
        interview: true, 
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==================================================
  // 6. REPORT JOB
  // ==================================================
  async reportJob(userId: string, dto: ReportJobDto) {
    return this.prisma.report.create({
      data: {
        reporterId: userId, // User table relation
        jobId: dto.jobId,
        reason: dto.reason,
        details: dto.details,
        status: 'PENDING',
      },
    });
  }

  // helper function: User ID find JobSeekerProfile ID 
  private async getProfileId(userId: string): Promise<string> {
    const profile = await this.prisma.jobSeekerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new BadRequestException('Job Seeker Profile not found');
    return profile.id;
  }
}