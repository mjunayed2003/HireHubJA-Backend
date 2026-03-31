import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import {
  CreateJobDto,
  ScheduleInterviewDto,
  UpdateApplicationStatusDto,
  UpdateJobDto,
  UpdateInterviewStatusDto,
} from './dto/employer.dto';
import { UpdateEmployerProfileDto, ChangePasswordDto } from './dto/employer-profile.dto';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class EmployerService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) { }

  // ==================================================
  // 1. DASHBOARD STATS
  // ==================================================
  async getDashboardStats(userId: string) {
    const employerId = await this.getEmployerId(userId);

    const activeJobs = await this.prisma.job.count({
      where: { employerId, status: 'OPEN' },
    });

    const pendingApplicants = await this.prisma.application.count({
      where: {
        job: { employerId },
        status: 'APPLIED',
      },
    });

    const interviewsScheduled = await this.prisma.interview.count({
      where: {
        application: { job: { employerId } },
        status: 'SCHEDULED',
      },
    });

    const hiresCompleted = await this.prisma.application.count({
      where: {
        job: { employerId },
        status: 'HIRED',
      },
    });

    return { activeJobs, pendingApplicants, interviewsScheduled, hiresCompleted };
  }

  // ==================================================
  // 2. POST A JOB
  // ==================================================
  async createJob(userId: string, dto: CreateJobDto) {
    const employerId = await this.getEmployerId(userId);

    return this.prisma.job.create({
      data: {
        employerId,
        title: dto.title,
        categories: {
          connect: dto.categoryIds.map(id => ({ id })),
        },
        jobType: dto.jobType,
        location: dto.location,
        workTime: dto.workTime ?? [],
        isRemote: dto.isRemote ?? false,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        numberOfEmployees: dto.numberOfEmployees,
        description: dto.description,
        responsibilities: dto.responsibilities ?? [],
        benefits: dto.benefits ?? [],
        experienceLevel: dto.experienceLevel,
        minExperience: dto.minExperience,
        educationLevel: dto.educationLevel,
        salaryType: dto.salaryType,
        salaryFrequency: dto.salaryFrequency,
        salaryAmount: dto.salaryAmount,
        isAnonymous: dto.isAnonymous ?? false,
        status: 'OPEN',
      },
      include: {
        categories: { select: { id: true } },
        employer: { select: { fullName: true, companyName: true } },
      },
    });
  }

  // ==================================================
  // 3. MY POSTED JOBS (with pagination + search)
  // ==================================================
  async getMyJobs(
    userId: string,
    params: {
      page: number;
      limit: number;
      search?: string;
    },
  ) {
    const { page, limit, search } = params;
    const employerId = await this.getEmployerId(userId);
    const skip = (page - 1) * limit;

    const where: any = { employerId };
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const [total, jobs] = await Promise.all([
      this.prisma.job.count({ where }),
      this.prisma.job.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: jobs.map((job) => ({
        id: job.id,
        title: job.title,
        location: job.location,
        workTime: job.workTime,
        salary: job.salaryAmount,
        salaryFrequency: job.salaryFrequency,
        type: job.jobType,
        status: job.status,
        experienceLevel: job.experienceLevel,
        totalApplicants: job._count.applications,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  // ==================================================
  // 3b. GET SINGLE JOB DETAILS
  // ==================================================
  async getJobById(userId: string, jobId: string) {
    const employerId = await this.getEmployerId(userId);

    const job = await this.prisma.job.findFirst({
      where: { id: jobId, employerId },
      include: {
        categories: { select: { id: true } },
        _count: {
          select: { applications: true },
        },
      },
    });

    if (!job) throw new NotFoundException('Job not found or access denied');
    return job;
  }

  // ==================================================
  // 3c. UPDATE JOB
  // ==================================================
  async updateJob(userId: string, jobId: string, dto: UpdateJobDto) {
    const employerId = await this.getEmployerId(userId);

    const existingJob = await this.prisma.job.findFirst({
      where: { id: jobId, employerId },
    });

    if (!existingJob) throw new NotFoundException('Job not found or access denied');

    return this.prisma.job.update({
      where: { id: jobId },
      data: {
        title: dto.title,
        ...(dto.categoryIds && {
          categories: {
            set: [],
            connect: dto.categoryIds.map(id => ({ id })),
          },
        }),
        jobType: dto.jobType,
        location: dto.location,
        workTime: dto.workTime,
        isRemote: dto.isRemote,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        numberOfEmployees: dto.numberOfEmployees,
        description: dto.description,
        responsibilities: dto.responsibilities,
        benefits: dto.benefits,
        experienceLevel: dto.experienceLevel,
        minExperience: dto.minExperience,
        educationLevel: dto.educationLevel,
        salaryType: dto.salaryType,
        salaryFrequency: dto.salaryFrequency,
        salaryAmount: dto.salaryAmount,
        isAnonymous: dto.isAnonymous,
        status: dto.status,
      },
      include: {
        categories: { select: { id: true } },
      },
    });
  }

  // ==================================================
  // 4. GET APPLICANTS FOR A JOB
  // ==================================================
  async getJobApplicants(userId: string, jobId: string) {
    const employerId = await this.getEmployerId(userId);

    const job = await this.prisma.job.findFirst({
      where: { id: jobId, employerId },
    });
    if (!job) throw new NotFoundException('Job not found or access denied');

    return this.prisma.application.findMany({
      where: { jobId },
      include: {
        jobSeeker: {
          select: {
            id: true,
            fullName: true,
            profilePic: true,
            experienceLevel: true,
            location: true,
            skills: true,
          },
        },
        interview: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==================================================
  // 5. CANDIDATE PROFILE — FIX
  // ==================================================
  async getApplicantDetails(userId: string, applicationId: string) {
    const employerId = await this.getEmployerId(userId);

    const application = await this.prisma.application.findFirst({
      where: {
        id: applicationId,
        job: { employerId }, // ✅ গার্ড
      },
      include: {
        jobSeeker: {
          include: {
            education: true,
            experience: true,
          },
        },
        job: true,
      },
    });

    if (!application) throw new NotFoundException('Application not found or access denied');
    return application;
  }

  // ==================================================
  // 6. SCHEDULE INTERVIEW
  // ==================================================
  async scheduleInterview(userId: string, applicationId: string, dto: ScheduleInterviewDto) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: true,
        jobSeeker: true,
      },
    });

    if (!application) throw new NotFoundException('Application not found');

    const interview = await this.prisma.interview.create({
      data: {
        applicationId,
        scheduleDate: new Date(dto.scheduleDate),
        scheduleTime: dto.scheduleTime,
        interviewType: dto.interviewType,
        duration: dto.duration,
        meetingLink: dto.meetingLink,
        notes: dto.notes,
        status: 'SCHEDULED',
      },
    });

    await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: 'INTERVIEW' },
    });

    await this.notificationService.createNotification(
      application.jobSeeker.userId,
      'Interview Scheduled',
      `Your interview for ${application.job.title} has been scheduled on ${dto.scheduleDate}.`,
      'INTERVIEW',
    );

    return interview;
  }

  // ==================================================
  // 7. UPDATE APPLICATION STATUS — FIX
  // ==================================================
  async updateApplicationStatus(userId: string, applicationId: string, dto: UpdateApplicationStatusDto) {
    const employerId = await this.getEmployerId(userId);

    // ✅ আগে ownership check করো
    const existing = await this.prisma.application.findFirst({
      where: {
        id: applicationId,
        job: { employerId },
      },
    });
    if (!existing) throw new NotFoundException('Application not found or access denied');

    const application = await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: dto.status },
      include: {
        job: true,
        jobSeeker: true,
      },
    });

    if (dto.status === 'HIRED') {
      await this.notificationService.createNotification(
        application.jobSeeker.userId,
        'Congratulations! You are Hired 🎉',
        `You have been hired for ${application.job.title}.`,
        'HIRED',
      );
    }

    if (dto.status === 'REJECTED') {
      await this.notificationService.createNotification(
        application.jobSeeker.userId,
        'Application Update',
        `Your application for ${application.job.title} was not selected.`,
        'REJECTED',
      );
    }

    return application;
  }

  // ==================================================
  // 8. GET ALL INTERVIEWS
  // ==================================================
  async getAllInterviews(userId: string) {
    const employerId = await this.getEmployerId(userId);

    return this.prisma.interview.findMany({
      where: {
        application: {
          job: { employerId },
        },
      },
      include: {
        application: {
          include: {
            jobSeeker: { select: { fullName: true, profilePic: true, experienceLevel: true } },
            job: { select: { title: true } },
          },
        },
      },
      orderBy: { scheduleDate: 'asc' },
    });
  }

  // ==================================================
  // 9. UPDATE INTERVIEW — FIX
  // ==================================================
  async updateInterview(userId: string, interviewId: string, dto: ScheduleInterviewDto) {
    const employerId = await this.getEmployerId(userId);

    // ✅ ownership check
    const interview = await this.prisma.interview.findFirst({
      where: {
        id: interviewId,
        application: {
          job: { employerId },
        },
      },
    });
    if (!interview) throw new NotFoundException('Interview not found or access denied');

    return this.prisma.interview.update({
      where: { id: interviewId },
      data: {
        scheduleDate: dto.scheduleDate ? new Date(dto.scheduleDate) : undefined,
        scheduleTime: dto.scheduleTime,
        interviewType: dto.interviewType,
        duration: dto.duration,
        meetingLink: dto.meetingLink,
        notes: dto.notes,
        editedAt: new Date(),
      },
    });
  }

  // ==================================================
  // 9b. UPDATE INTERVIEW STATUS
  // ==================================================
  async updateInterviewStatus(userId: string, interviewId: string, dto: UpdateInterviewStatusDto) {
    const employerId = await this.getEmployerId(userId);

    const existingInterview = await this.prisma.interview.findFirst({
      where: {
        id: interviewId,
        application: {
          job: { employerId },
        },
      },
      include: {
        application: {
          include: {
            job: true,
            jobSeeker: true,
          },
        },
      },
    });

    if (!existingInterview) {
      throw new NotFoundException('Interview not found or access denied');
    }

    const interview = await this.prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: dto.status,
        editedAt: new Date(),
      },
      include: {
        application: {
          include: {
            job: true,
            jobSeeker: true,
          },
        },
      },
    });

    if (dto.status === 'HIRED') {
      await this.prisma.application.update({
        where: { id: interview.applicationId },
        data: { status: 'HIRED' },
      });

      await this.notificationService.createNotification(
        interview.application.jobSeeker.userId,
        'Congratulations! You are Hired',
        `You have been hired for ${interview.application.job.title}.`,
        'HIRED',
      );
    }

    if (dto.status === 'REJECTED') {
      await this.prisma.application.update({
        where: { id: interview.applicationId },
        data: { status: 'REJECTED' },
      });

      await this.notificationService.createNotification(
        interview.application.jobSeeker.userId,
        'Interview Update',
        `Your interview outcome for ${interview.application.job.title} is marked as not selected.`,
        'REJECTED',
      );
    }

    if (dto.status === 'SCHEDULED' || dto.status === 'COMPLETED') {
      await this.prisma.application.update({
        where: { id: interview.applicationId },
        data: { status: 'INTERVIEW' },
      });
    }

    return interview;
  }

  // ==================================================
  // GET PROFILE
  // ==================================================
  async getProfile(userId: string) {
    const profile = await this.prisma.employerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  // ==================================================
  // UPDATE PROFILE
  // ==================================================
  async updateProfile(
    userId: string,
    dto: UpdateEmployerProfileDto,
    profilePic?: string | null,
    licenseFile?: string | null,
  ) {
    const profile = await this.prisma.employerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Profile not found');

    return this.prisma.employerProfile.update({
      where: { userId },
      data: {
        fullName: dto.fullName,
        companyName: dto.companyName,
        phone: dto.phone,
        location: dto.location,
        about: dto.about,
        website: dto.website,
        businessRegCertId: dto.businessRegCertId,
        taxId: dto.taxId,
        authorizedRepId: dto.authorizedRepId,
        profilePic: profilePic ?? undefined,
        licenseFile: licenseFile ?? undefined,
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
  // SYSTEM CONTENT
  // ==================================================
  async getSystemContent(key: string) {
    const content = await this.prisma.systemContent.findUnique({
      where: { key },
    });
    if (!content) throw new NotFoundException('Content not found');
    return content;
  }

  // ==================================================
  // DELETE ACCOUNT
  // ==================================================
  async deleteAccount(userId: string) {
    await this.prisma.user.delete({ where: { id: userId } });
    return { message: 'Account deleted successfully' };
  }

  // ==================================================
  // HELPER
  // ==================================================
  private async getEmployerId(userId: string): Promise<string> {
    const profile = await this.prisma.employerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new BadRequestException('Employer Profile not found');
    return profile.id;
  }
}