import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateJobDto, ScheduleInterviewDto, UpdateApplicationStatusDto } from './dto/employer.dto';

@Injectable()
export class EmployerService {
  constructor(private prisma: PrismaService) {}

  // ==================================================
  // 1. DASHBOARD STATS (UI: 4 Box Data)
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
  // 2. POST A JOB (UI: Multi-step Form)
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
        salaryRange: dto.salaryRange,
        description: dto.description,
        status: 'OPEN',
      },
    });
  }

  // ==================================================
  // 3. MY POSTED JOBS (UI: Grid Cards)
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
      salary: job.salaryRange,
      type: job.jobType,
      status: job.status,
      totalApplicants: job._count.applications, // Applicants: 06
      postedDate: job.createdAt,
    }));
  }

  // ==================================================
  // 4. GET APPLICANTS FOR A JOB (UI: Candidate List)
  // ==================================================
  async getJobApplicants(userId: string, jobId: string) {
    const employerId = await this.getEmployerId(userId);

    const job = await this.prisma.job.findFirst({
        where: { id: jobId, employerId }
    });
    if(!job) throw new NotFoundException("Job not found or access denied");

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
                skills: true
            }
        },
        interview: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // ==================================================
  // 5. CANDIDATE PROFILE (UI: Profile Details & Resume)
  // ==================================================
  async getApplicantDetails(applicationId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        jobSeeker: {
          include: {
            education: true,
            experience: true,
          }
        },
        job: true,
      },
    });

    if (!application) throw new NotFoundException('Application not found');
    return application;
  }

  // ==================================================
  // 6. SCHEDULE INTERVIEW (UI: Schedule Modal)
  // ==================================================
  async scheduleInterview(userId: string, applicationId: string, dto: ScheduleInterviewDto) {
    const application = await this.prisma.application.findUnique({
        where: { id: applicationId },
        include: { job: true }
    });

    if(!application) throw new NotFoundException("Application not found");
    
    const interview = await this.prisma.interview.create({
        data: {
            applicationId: applicationId,
            scheduleDate: new Date(dto.scheduleDate),
            meetingLink: dto.meetingLink,
            notes: dto.notes,
            status: 'SCHEDULED'
        }
    });

    await this.prisma.application.update({
        where: { id: applicationId },
        data: { status: 'INTERVIEW' }
    });

    return interview;
  }

  // ==================================================
  // 7. REJECT OR HIRE (UI: Reject/Hire Buttons)
  // ==================================================
  async updateApplicationStatus(applicationId: string, dto: UpdateApplicationStatusDto) {
    return this.prisma.application.update({
        where: { id: applicationId },
        data: { status: dto.status }
    });
  }
  
  // (UI: Interview Scheduled Page)
  async getAllInterviews(userId: string) {
      const employerId = await this.getEmployerId(userId);
      return this.prisma.interview.findMany({
          where: {
              application: {
                  job: { employerId }
              }
          },
          include: {
              application: {
                  include: {
                      jobSeeker: { select: { fullName: true, profilePic: true, experienceLevel: true } },
                      job: { select: { title: true } }
                  }
              }
          },
          orderBy: { scheduleDate: 'asc' }
      });
  }


  // Helper: Get Employer Profile ID from User ID
  private async getEmployerId(userId: string): Promise<string> {
    const profile = await this.prisma.employerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new BadRequestException('Employer Profile not found');
    return profile.id;
  }
}