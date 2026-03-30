import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApplyJobDto, ReportJobDto } from './dto/job-action.dto';
import * as bcrypt from 'bcrypt';
import { UpdateProfileDto, ChangePasswordDto } from './dto/profile.dto';
import { NotificationService } from 'src/notification/notification.service';
import { Prisma } from '../generated/prisma/client';

@Injectable()
export class JobSeekerService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) { }


  // ==================================================
  // 1. HOME & SEARCH (With Advanced Filters)
  // ==================================================
  async getAllJobs(query: any) {
  const {
    search,
    location,
    categoryId,
    workplaceType,
    employmentType,
    minSalary,
    maxSalary,
    page = 1,
    limit = 15,
  } = query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const jobTypesToSearch: string[] = [];

  if (workplaceType) {
    jobTypesToSearch.push(workplaceType.toUpperCase().replace('-', '_'));
  }
  if (employmentType) {
    jobTypesToSearch.push(employmentType.toUpperCase().replace('-', '_'));
  }

  const whereConditions: Prisma.JobWhereInput[] = [];
  
  if (search) {
    whereConditions.push({ title: { contains: search, mode: Prisma.QueryMode.insensitive } });
  }
  if (location) {
    whereConditions.push({ location: { contains: location, mode: Prisma.QueryMode.insensitive } });
  }
  if (categoryId) {
    whereConditions.push({ categoryId });
  }
  if (jobTypesToSearch.length > 0) {
    whereConditions.push({ jobType: { hasEvery: jobTypesToSearch as any } });
  }

  const whereClause: Prisma.JobWhereInput = {
    status: 'OPEN',
    AND: [
      search ? { title: { contains: search, mode: 'insensitive' } } : {},
      location ? { location: { contains: location, mode: 'insensitive' } } : {},
      categoryId ? { categoryId } : {},
      jobTypesToSearch.length > 0
        ? { jobType: { hasEvery: jobTypesToSearch as any } }
        : {},
    ],
  };

  let [jobs, total] = await Promise.all([
    this.prisma.job.findMany({
      where: whereClause,
      include: {
        employer: { select: { fullName: true, profilePic: true } },
        category: true,
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    this.prisma.job.count({ where: whereClause }),
  ]);

  // Salary filter (in-memory — কারণ salary string)
  if (minSalary || maxSalary) {
    const filterMin = minSalary ? Number(minSalary) : 0;
    const filterMax = maxSalary ? Number(maxSalary) : Infinity;

    jobs = jobs.filter((job) => {
      if (!job.salaryAmount) return false;
      const extractedNumbers = job.salaryAmount.match(/\d+/g);
      if (!extractedNumbers) return false;
      const jobMinSalary = Number(extractedNumbers[0]);
      const jobMaxSalary = extractedNumbers.length > 1
        ? Number(extractedNumbers[1])
        : jobMinSalary;
      return jobMaxSalary >= filterMin && jobMinSalary <= filterMax;
    });
  }

  return {
    data: jobs,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
      hasNextPage: Number(page) * Number(limit) < total,
    },
  };
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

    const profileId = await this.getProfileId(userId);

    const hasApplied = await this.prisma.application.findUnique({
      where: {
        jobId_jobSeekerId: { jobId, jobSeekerId: profileId },
      },
    });

    const isBookmarked = await this.prisma.savedJob.findUnique({
      where: {
        jobId_jobSeekerId: { jobId, jobSeekerId: profileId },
      },
    });

    return {
      ...job,
      hasApplied: !!hasApplied,
      isBookmarked: !!isBookmarked,
    };
  }

  // ==================================================
  // 3. APPLY JOB
  // ==================================================
  async applyJob(userId: string, dto: ApplyJobDto, resumeUrl: string | null) {
    const profileId = await this.getProfileId(userId);

    const existingApp = await this.prisma.application.findUnique({
      where: {
        jobId_jobSeekerId: { jobId: dto.jobId, jobSeekerId: profileId },
      },
    });

    if (existingApp) throw new BadRequestException('You have already applied to this job!');

    const application = await this.prisma.application.create({
      data: {
        jobId: dto.jobId,
        jobSeekerId: profileId,
        status: 'APPLIED', 
        resumeUrl: resumeUrl,
        availableFrom: dto.availableFrom ? new Date(dto.availableFrom) : null,
        shortMessage: dto.shortMessage ?? null,

        // --- References ---
        refJobName: dto.refJobName,
        refJobCompany: dto.refJobCompany,
        refJobTitle: dto.refJobTitle,
        refJobRelationship: dto.refJobRelationship,
        refJobPhone: dto.refJobPhone,
        refJobEmail: dto.refJobEmail,

        refJpName: dto.refJpName,
        refJpContact: dto.refJpContact,
        refJpJurisdiction: dto.refJpJurisdiction,
        refJpRelationship: dto.refJpRelationship,

        refPastorName: dto.refPastorName,
        refPastorChurch: dto.refPastorChurch,
        refPastorContact: dto.refPastorContact,
        refPastorRelationship: dto.refPastorRelationship,

        refRelativeName: dto.refRelativeName,
        refRelativeContact: dto.refRelativeContact,
        refRelativeRelationship: dto.refRelativeRelationship,
      },
    });

    // send notification for employer
    const job = await this.prisma.job.findUnique({
      where: { id: dto.jobId },
      include: { employer: true },
    });

    if (job) {
      await this.notificationService.createNotification(
        job.employer.userId,
        'New Application Received',
        `Someone applied for your job: ${job.title}`,
        'APPLICATION',
      );
    }

    return application;
  }
  // ==================================================
  // 4. BOOKMARK / SAVE JOB (Toggle)
  // ==================================================
  async toggleBookmark(userId: string, jobId: string) {
    const profileId = await this.getProfileId(userId);

    const existing = await this.prisma.savedJob.findUnique({
      where: {
        jobId_jobSeekerId: { jobId, jobSeekerId: profileId },
      },
    });

    if (existing) {
      await this.prisma.savedJob.delete({ where: { id: existing.id } });
      return { message: 'Job removed from bookmarks', isBookmarked: false };
    } else {
      await this.prisma.savedJob.create({
        data: { jobId, jobSeekerId: profileId },
      });
      return { message: 'Job bookmarked successfully', isBookmarked: true };
    }
  }

  // ==================================================
  // 4b. GET BOOKMARKED JOBS
  // ==================================================
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
  // 5. TRACK APPLICATIONS
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
        reporterId: userId,
        jobId: dto.jobId,
        reason: dto.reason,
        details: dto.details,
        status: 'PENDING',
      },
    });
  }

  // ==================================================
  // HELPER
  // ==================================================
  private async getProfileId(userId: string): Promise<string> {
    const profile = await this.prisma.jobSeekerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new BadRequestException('Job Seeker Profile not found');
    return profile.id;
  }

  // ==================================================
  // GET PROFILE
  // ==================================================
  async getProfile(userId: string) {
    const profile = await this.prisma.jobSeekerProfile.findUnique({
      where: { userId },
      include: {
        education: true,
        experience: true,
        preferredJobCategories: true,
      },
    });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  // ==================================================
  // UPDATE PROFILE
  // ==================================================
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    profilePic?: string | null,
    resumeUrl?: string | null,
  ) {
    const profile = await this.prisma.jobSeekerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Profile not found');

    const skills = typeof dto.skills === 'string'
      ? JSON.parse(dto.skills)
      : dto.skills ?? undefined;

    const education = typeof dto.education === 'string'
      ? JSON.parse(dto.education)
      : dto.education;

    const experience = typeof dto.experience === 'string'
      ? JSON.parse(dto.experience)
      : dto.experience;

    if (education) {
      await this.prisma.education.deleteMany({
        where: { jobSeekerId: profile.id },
      });
    }

    if (experience) {
      await this.prisma.experience.deleteMany({
        where: { jobSeekerId: profile.id },
      });
    }

    return this.prisma.jobSeekerProfile.update({
      where: { userId },
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        location: dto.location,
        about: dto.about,
        experienceLevel: dto.experienceLevel,
        skills: skills,
        profilePic: profilePic ?? undefined,
        resumeUrl: resumeUrl ?? undefined,

        education: education ? {
          create: education.map((edu) => ({
            degreeName: edu.degreeName,
            institution: edu.institution,
            startDate: new Date(edu.startDate),
            completionYear: edu.completionYear
              ? new Date(edu.completionYear)
              : null,
            isCurrent: edu.isCurrent ?? false,
          })),
        } : undefined,

        experience: experience ? {
          create: experience.map((exp) => ({
            designation: exp.designation,
            companyName: exp.companyName,
            startDate: new Date(exp.startDate),
            endDate: exp.endDate ? new Date(exp.endDate) : null,
            isCurrent: exp.isCurrent ?? false,
            description: exp.description,
          })),
        } : undefined,
      },
      include: {
        education: true,
        experience: true,
      },
    });
  }

  // ==================================================
  // CHANGE PASSWORD
  // ==================================================
  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) throw new BadRequestException('Current password is incorrect');

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { message: 'Password changed successfully' };
  }

  // ==================================================
  // DELETE ACCOUNT
  // ==================================================
  async deleteAccount(userId: string) {
    await this.prisma.user.delete({ where: { id: userId } });
    return { message: 'Account deleted successfully' };
  }
}