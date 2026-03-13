import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminJobsQueryDto } from './dto/jobs-query.dto';
import { JobStatus } from '@prisma/client';

@Injectable()
export class AdminJobsService {
  constructor(private readonly prisma: PrismaService) {}

  async getJobs(query: AdminJobsQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { employer: { companyName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, jobs] = await Promise.all([
      this.prisma.job.count({ where }),
      this.prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          location: true,
          jobType: true,
          status: true,
          isRemote: true,
          deadline: true,
          createdAt: true,
          category: { select: { id: true, name: true } },
          employer: {
            select: {
              companyName: true,
              fullName: true,
              profilePic: true,
              user: { select: { email: true } },
            },
          },
          _count: { select: { applications: true } },
        },
      }),
    ]);

    const formatted = jobs.map((j) => ({
      id: j.id,
      title: j.title,
      location: j.location,
      jobType: j.jobType,
      status: j.status,
      isRemote: j.isRemote,
      deadline: j.deadline,
      createdAt: j.createdAt,
      category: j.category,
      companyName: j.employer.companyName,
      employerName: j.employer.fullName,
      employerEmail: j.employer.user.email,
      companyLogo: j.employer.profilePic,
      totalApplications: j._count.applications,
    }));

    return {
      success: true,
      data: formatted,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getJobById(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        category: true,
        employer: {
          select: {
            companyName: true,
            fullName: true,
            profilePic: true,
            location: true,
            about: true,
            user: { select: { email: true } },
          },
        },
        _count: { select: { applications: true } },
      },
    });

    if (!job) throw new NotFoundException('Job not found');
    return { success: true, data: job };
  }

  async blockJob(id: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');

    if (job.status === JobStatus.BLOCKED_BY_ADMIN) {
      return { success: true, message: 'Job is already blocked' };
    }

    await this.prisma.job.update({
      where: { id },
      data: { status: JobStatus.BLOCKED_BY_ADMIN },
    });

    return { success: true, message: 'Job blocked successfully' };
  }

  async unblockJob(id: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');

    await this.prisma.job.update({
      where: { id },
      data: { status: 'OPEN' },
    });

    return { success: true, message: 'Job unblocked successfully' };
  }
}