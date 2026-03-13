import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminInterviewsQueryDto } from './dto/admin-interviews-query.dto';

@Injectable()
export class AdminInterviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────
  // GET ALL INTERVIEWS
  // ─────────────────────────────────────────────────────
  async getInterviews(query: AdminInterviewsQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Status filter
    if (query.status) where.status = query.status;

    // Date filter
    if (query.date) {
      const start = new Date(query.date);
      const end = new Date(query.date);
      end.setDate(end.getDate() + 1);
      where.scheduleDate = { gte: start, lt: end };
    }

    // Employer / Candidate / Search filter
    const applicationFilter: any = {};

    if (query.employer) {
      applicationFilter.job = {
        employer: {
          OR: [
            { fullName: { contains: query.employer, mode: 'insensitive' } },
            { companyName: { contains: query.employer, mode: 'insensitive' } },
          ],
        },
      };
    }

    if (query.candidate) {
      applicationFilter.jobSeeker = {
        fullName: { contains: query.candidate, mode: 'insensitive' },
      };
    }

    if (query.search) {
      applicationFilter.OR = [
        { job: { title: { contains: query.search, mode: 'insensitive' } } },
        { jobSeeker: { fullName: { contains: query.search, mode: 'insensitive' } } },
        { job: { employer: { fullName: { contains: query.search, mode: 'insensitive' } } } },
        { job: { employer: { companyName: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }

    if (Object.keys(applicationFilter).length > 0) {
      where.application = applicationFilter;
    }

    const [total, interviews] = await Promise.all([
      this.prisma.interview.count({ where }),
      this.prisma.interview.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          interviewType: true,
          scheduleDate: true,
          scheduleTime: true,
          duration: true,
          meetingLink: true,
          status: true,
          notes: true,
          createdAt: true,
          application: {
            select: {
              id: true,
              status: true,
              job: {
                select: {
                  id: true,
                  title: true,
                  location: true,
                  employer: {
                    select: {
                      fullName: true,
                      companyName: true,
                      profilePic: true,
                      user: { select: { email: true } },
                    },
                  },
                },
              },
              jobSeeker: {
                select: {
                  fullName: true,
                  profilePic: true,
                  user: { select: { email: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    const formatted = interviews.map((i) => ({
      id: i.id,
      interviewType: i.interviewType,
      scheduleDate: i.scheduleDate,
      scheduleTime: i.scheduleTime,
      duration: i.duration,
      meetingLink: i.meetingLink,
      status: i.status,
      notes: i.notes,
      createdAt: i.createdAt,
      jobTitle: i.application.job.title,
      jobLocation: i.application.job.location,
      employer: {
        fullName: i.application.job.employer.fullName,
        companyName: i.application.job.employer.companyName,
        profilePic: i.application.job.employer.profilePic,
        email: i.application.job.employer.user.email,
      },
      jobSeeker: {
        fullName: i.application.jobSeeker.fullName,
        profilePic: i.application.jobSeeker.profilePic,
        email: i.application.jobSeeker.user.email,
      },
    }));

    return {
      success: true,
      data: formatted,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─────────────────────────────────────────────────────
  // GET INTERVIEW BY ID
  // ─────────────────────────────────────────────────────
  async getInterviewById(id: string) {
    const interview = await this.prisma.interview.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            job: {
              include: {
                category: true,
                employer: {
                  select: {
                    fullName: true,
                    companyName: true,
                    profilePic: true,
                    location: true,
                    about: true,
                    user: { select: { email: true } },
                  },
                },
              },
            },
            jobSeeker: {
              select: {
                fullName: true,
                profilePic: true,
                phone: true,
                location: true,
                resumeUrl: true,
                user: { select: { email: true } },
              },
            },
          },
        },
      },
    });

    if (!interview) throw new NotFoundException('Interview not found');

    return { success: true, data: interview };
  }
}

