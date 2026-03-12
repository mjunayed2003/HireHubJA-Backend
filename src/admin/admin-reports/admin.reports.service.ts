import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ReportsQueryDto } from './dto/report-query.dto';

@Injectable()
export class AdminReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────
  // GET ALL REPORTS
  // ─────────────────────────────────────────────────────
  async getReports(query: ReportsQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;

    const [total, reports] = await Promise.all([
      this.prisma.report.count({ where }),
      this.prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          reason: true,
          details: true,
          status: true,
          createdAt: true,
          reporter: {
            select: {
              id: true,
              email: true,
              role: true,
              jobSeekerProfile: { select: { fullName: true, profilePic: true } },
              employerProfile: { select: { fullName: true, profilePic: true } },
            },
          },
          job: {
            select: {
              id: true,
              title: true,
              location: true,
              status: true,
              employer: {
                select: { companyName: true, fullName: true },
              },
            },
          },
        },
      }),
    ]);

    const formatted = reports.map((r) => ({
      id: r.id,
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: r.createdAt,
      reporter: {
        id: r.reporter.id,
        email: r.reporter.email,
        role: r.reporter.role,
        fullName:
          r.reporter.jobSeekerProfile?.fullName ??
          r.reporter.employerProfile?.fullName ??
          'N/A',
        profilePic:
          r.reporter.jobSeekerProfile?.profilePic ??
          r.reporter.employerProfile?.profilePic ??
          null,
      },
      job: r.job
        ? {
            id: r.job.id,
            title: r.job.title,
            location: r.job.location,
            status: r.job.status,
            companyName:
              r.job.employer.companyName ?? r.job.employer.fullName,
          }
        : null,
    }));

    return {
      success: true,
      data: formatted,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─────────────────────────────────────────────────────
  // GET REPORT BY ID
  // ─────────────────────────────────────────────────────
  async getReportById(id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      select: {
        id: true,
        reason: true,
        details: true,
        status: true,
        createdAt: true,
        editedAt: true,
        reporter: {
          select: {
            id: true,
            email: true,
            role: true,
            jobSeekerProfile: {
              select: { fullName: true, profilePic: true, phone: true, location: true },
            },
            employerProfile: {
              select: { fullName: true, companyName: true, profilePic: true, phone: true },
            },
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            description: true,
            location: true,
            status: true,
            createdAt: true,
            employer: {
              select: {
                companyName: true,
                fullName: true,
                profilePic: true,
                location: true,
              },
            },
          },
        },
      },
    });

    if (!report) throw new NotFoundException('Report not found');

    return { success: true, data: report };
  }

  // ─────────────────────────────────────────────────────
  // RESOLVE REPORT
  // ─────────────────────────────────────────────────────
  async resolveReport(id: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');

    if (report.status === 'RESOLVED') {
      return { success: true, message: 'Report is already resolved' };
    }

    await this.prisma.report.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        editedAt: new Date(),
      },
    });

    return { success: true, message: 'Report resolved successfully' };
  }
}