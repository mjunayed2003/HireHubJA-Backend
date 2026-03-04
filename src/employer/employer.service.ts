import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateJobDto, ScheduleInterviewDto, UpdateApplicationStatusDto } from './dto/employer.dto';
import { UpdateEmployerProfileDto, ChangePasswordDto } from './dto/employer-profile.dto';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class EmployerService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService, // ✅
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
        categoryId: dto.categoryId,
        jobType: dto.jobType,
        location: dto.location,
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
    });
  }

  // ==================================================
  // 3. MY POSTED JOBS
  // ==================================================
  async getMyJobs(userId: string) {
    const employerId = await this.getEmployerId(userId);

    const jobs = await this.prisma.job.findMany({
      where: { employerId },
      include: {
        _count: {
          select: { applications: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return jobs.map((job) => ({
      id: job.id,
      title: job.title,
      location: job.location,
      salary: job.salaryAmount,
      type: job.jobType,
      status: job.status,
      totalApplicants: job._count.applications,
      postedDate: job.createdAt,
    }));
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
  // 5. CANDIDATE PROFILE
  // ==================================================
  async getApplicantDetails(applicationId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
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

    if (!application) throw new NotFoundException('Application not found');
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
        jobSeeker: true, // ✅ user include লাগবে না, jobSeeker তে userId directly আছে
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

    // ✅ Job Seeker কে notification পাঠান
    await this.notificationService.createNotification(
      application.jobSeeker.userId,
      'Interview Scheduled',
      `Your interview for ${application.job.title} has been scheduled on ${dto.scheduleDate}.`,
      'INTERVIEW',
    );

    return interview;
  }

  // ==================================================
  // 7. REJECT OR HIRE
  // ==================================================
  async updateApplicationStatus(applicationId: string, dto: UpdateApplicationStatusDto) {
    const application = await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: dto.status },
      include: {
        job: true,
        jobSeeker: true,
      },
    });

    // ✅ Hired হলে notification পাঠান
    if (dto.status === 'HIRED') {
      await this.notificationService.createNotification(
        application.jobSeeker.userId,
        'Congratulations! You are Hired 🎉',
        `You have been hired for ${application.job.title}.`,
        'HIRED',
      );
    }

    // ✅ Rejected হলে notification পাঠান
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
  // 9. UPDATE INTERVIEW
  // ==================================================
  async updateInterview(interviewId: string, dto: ScheduleInterviewDto) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview) throw new NotFoundException('Interview not found');

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