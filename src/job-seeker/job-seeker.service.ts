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

    const pagination = this.getPagination(page, limit);
    const jobTypesToSearch = this.buildJobTypesToSearch(workplaceType, employmentType);

    const whereClause = this.buildJobsWhereClause({
      search,
      location,
      categoryId,
      jobTypesToSearch,
    });

    return this.findJobsWithPagination(whereClause, pagination, minSalary, maxSalary);
  }

  // ==================================================
  // 1b. JOBS MATCHED WITH USER PREFERRED CATEGORIES
  // ==================================================
  async getCategoryMatchedJobs(userId: string, query: any) {
    const {
      search,
      location,
      workplaceType,
      employmentType,
      minSalary,
      maxSalary,
      page = 1,
      limit = 15,
    } = query;

    const profile = await this.prisma.jobSeekerProfile.findUnique({
      where: { userId },
      select: {
        preferredJobCategories: {
          select: { id: true },
        },
      },
    });

    if (!profile) throw new NotFoundException('Profile not found');

    const categoryIds = profile.preferredJobCategories.map((category) => category.id);
    const pagination = this.getPagination(page, limit);

    if (categoryIds.length === 0) {
      return {
        data: [],
        meta: {
          total: 0,
          page: pagination.page,
          limit: pagination.limit,
          totalPages: 0,
          hasNextPage: false,
        },
      };
    }

    const jobTypesToSearch = this.buildJobTypesToSearch(workplaceType, employmentType);

    const whereClause = this.buildJobsWhereClause({
      search,
      location,
      categoryIds,
      jobTypesToSearch,
    });

    return this.findJobsWithPagination(whereClause, pagination, minSalary, maxSalary);
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
  private getPagination(pageInput: any, limitInput: any) {
    const parsedPage = Number(pageInput);
    const parsedLimit = Number(limitInput);

    const page = Number.isFinite(parsedPage) && parsedPage > 0
      ? Math.floor(parsedPage)
      : 1;
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(Math.floor(parsedLimit), 100)
      : 15;

    return {
      page,
      limit,
      skip: (page - 1) * limit,
      take: limit,
    };
  }

  private buildJobTypesToSearch(workplaceType?: string, employmentType?: string): string[] {
    const jobTypesToSearch: string[] = [];

    if (workplaceType) {
      jobTypesToSearch.push(workplaceType.toUpperCase().replace('-', '_'));
    }
    if (employmentType) {
      jobTypesToSearch.push(employmentType.toUpperCase().replace('-', '_'));
    }

    return jobTypesToSearch;
  }

  private buildJobsWhereClause(params: {
    search?: string;
    location?: string;
    categoryId?: string;
    categoryIds?: string[];
    jobTypesToSearch: string[];
  }): Prisma.JobWhereInput {
    const andConditions: Prisma.JobWhereInput[] = [];

    if (params.search) {
      andConditions.push({
        title: { contains: params.search, mode: Prisma.QueryMode.insensitive },
      });
    }

    if (params.location) {
      andConditions.push({
        location: { contains: params.location, mode: Prisma.QueryMode.insensitive },
      });
    }

    if (params.categoryId) {
      andConditions.push({ categoryId: params.categoryId });
    }

    if (params.categoryIds && params.categoryIds.length > 0) {
      andConditions.push({ categoryId: { in: params.categoryIds } });
    }

    if (params.jobTypesToSearch.length > 0) {
      andConditions.push({ jobType: { hasEvery: params.jobTypesToSearch as any } });
    }

    const whereClause: Prisma.JobWhereInput = {
      status: 'OPEN',
    };

    if (andConditions.length > 0) {
      whereClause.AND = andConditions;
    }

    return whereClause;
  }

  private hasSalaryFilter(minSalary?: any, maxSalary?: any) {
    return minSalary !== undefined && minSalary !== null && minSalary !== ''
      || maxSalary !== undefined && maxSalary !== null && maxSalary !== '';
  }

  private applySalaryFilter<T extends { salaryAmount: string | null }>(
    jobs: T[],
    minSalary?: any,
    maxSalary?: any,
  ) {
    if (!this.hasSalaryFilter(minSalary, maxSalary)) {
      return jobs;
    }

    const filterMin = minSalary ? Number(minSalary) : 0;
    const filterMax = maxSalary ? Number(maxSalary) : Infinity;

    return jobs.filter((job) => {
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

  private async findJobsWithPagination(
    whereClause: Prisma.JobWhereInput,
    pagination: { page: number; limit: number; skip: number; take: number },
    minSalary?: any,
    maxSalary?: any,
  ) {
    const baseQuery = {
      where: whereClause,
      include: {
        employer: { select: { fullName: true, profilePic: true } },
        category: true,
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' as const },
    };

    let jobs: any[];
    let total: number;

    if (this.hasSalaryFilter(minSalary, maxSalary)) {
      const allJobs = await this.prisma.job.findMany(baseQuery);
      const filteredJobs = this.applySalaryFilter(allJobs, minSalary, maxSalary);

      total = filteredJobs.length;
      jobs = filteredJobs.slice(pagination.skip, pagination.skip + pagination.take);
    } else {
      const [pagedJobs, count] = await Promise.all([
        this.prisma.job.findMany({
          ...baseQuery,
          skip: pagination.skip,
          take: pagination.take,
        }),
        this.prisma.job.count({ where: whereClause }),
      ]);

      jobs = pagedJobs;
      total = count;
    }

    return {
      data: jobs,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
        hasNextPage: pagination.page * pagination.limit < total,
      },
    };
  }

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