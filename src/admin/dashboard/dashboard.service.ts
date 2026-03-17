import { Injectable } from '@nestjs/common';
import { UserRole, UserStatus, JobStatus, PaymentStatus } from '../../generated/prisma/client';
import { subDays, startOfWeek, startOfMonth, startOfYear, eachDayOfInterval, eachMonthOfInterval, format } from 'date-fns';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) { }

  // ─────────────────────────────────────────────────────────────
  // 1. STATS
  // ─────────────────────────────────────────────────────────────
  async getStats() {
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);

    const [totalJobSeekers, totalEmployers, totalCompanies, activeJobPosts] = await Promise.all([
      this.prisma.user.count({ where: { role: UserRole.JOB_SEEKER } }),
      this.prisma.user.count({ where: { role: UserRole.EMPLOYER } }),
      this.prisma.user.count({ where: { role: UserRole.COMPANY } }),
      this.prisma.job.count({ where: { status: JobStatus.OPEN } }),
    ]);

    const [prevJobSeekers, prevEmployers, prevCompanies, prevActiveJobs] = await Promise.all([
      this.prisma.user.count({ where: { role: UserRole.JOB_SEEKER, createdAt: { lt: thirtyDaysAgo } } }),
      this.prisma.user.count({ where: { role: UserRole.EMPLOYER, createdAt: { lt: thirtyDaysAgo } } }),
      this.prisma.user.count({ where: { role: UserRole.COMPANY, createdAt: { lt: thirtyDaysAgo } } }),
      this.prisma.job.count({ where: { status: JobStatus.OPEN, createdAt: { lt: thirtyDaysAgo } } }),
    ]);

    const calcGrowth = (current: number, prev: number) => {
      if (prev === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - prev) / prev) * 100);
    };

    return {
      success: true,
      data: {
        totalJobSeekers: {
          count: totalJobSeekers,
          growthPercent: calcGrowth(totalJobSeekers, prevJobSeekers),
          label: 'Total Job Seekers',
        },
        totalEmployers: {
          count: totalEmployers,
          growthPercent: calcGrowth(totalEmployers, prevEmployers),
          label: 'Total Employers',
        },
        totalCompanies: {
          count: totalCompanies,
          growthPercent: calcGrowth(totalCompanies, prevCompanies),
          label: 'Total Companies',
        },
        activeJobPosts: {
          count: activeJobPosts,
          growthPercent: calcGrowth(activeJobPosts, prevActiveJobs),
          label: 'Active Job Posts',
        },
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 2. PIE CHART
  // ─────────────────────────────────────────────────────────────
  async getPieChart() {
    const [totalJobSeekers, totalEmployers, totalCompanies, activeJobSeekers, activeEmployers, activeCompanies] =
      await Promise.all([
        this.prisma.user.count({ where: { role: UserRole.JOB_SEEKER } }),
        this.prisma.user.count({ where: { role: UserRole.EMPLOYER } }),
        this.prisma.user.count({ where: { role: UserRole.COMPANY } }),
        this.prisma.user.count({ where: { role: UserRole.JOB_SEEKER, status: UserStatus.ACTIVE } }),
        this.prisma.user.count({ where: { role: UserRole.EMPLOYER, status: UserStatus.ACTIVE } }),
        this.prisma.user.count({ where: { role: UserRole.COMPANY, status: UserStatus.ACTIVE } }),
      ]);

    const calcPercent = (active: number, total: number) =>
      total === 0 ? 0 : Math.round((active / total) * 100);

    return {
      success: true,
      data: {
        jobSeeker: {
          label: 'Job Seeker',
          total: totalJobSeekers,
          active: activeJobSeekers,
          percentage: calcPercent(activeJobSeekers, totalJobSeekers),
        },
        employer: {
          label: 'Employer',
          total: totalEmployers,
          active: activeEmployers,
          percentage: calcPercent(activeEmployers, totalEmployers),
        },
        company: {
          label: 'Companies',
          total: totalCompanies,
          active: activeCompanies,
          percentage: calcPercent(activeCompanies, totalCompanies),
        },
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 3. EARNINGS
  // ─────────────────────────────────────────────────────────────
  async getEarnings(period: 'weekly' | 'monthly' | 'yearly' = 'weekly') {
    const now = new Date();
    let startDate: Date;
    let groupFormat: string;

    if (period === 'weekly') {
      startDate = startOfWeek(now, { weekStartsOn: 0 });
      groupFormat = 'EEE';
    } else if (period === 'monthly') {
      startDate = startOfMonth(now);
      groupFormat = 'dd';
    } else {
      startDate = startOfYear(now);
      groupFormat = 'MMM';
    }

    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.PAID,
        paidAt: { gte: startDate, lte: now },
      },
      select: {
        platformFee: true,
        paidAt: true,
      },
    });

    let labels: string[] = [];
    let dataMap: Record<string, number> = {};

    if (period === 'weekly' || period === 'monthly') {
      const days = eachDayOfInterval({ start: startDate, end: now });
      labels = days.map((d) => format(d, groupFormat));
      labels.forEach((l) => (dataMap[l] = 0));
      payments.forEach((p) => {
        if (p.paidAt) {
          const key = format(p.paidAt, groupFormat);
          dataMap[key] = (dataMap[key] || 0) + Number(p.platformFee);
        }
      });
    } else {
      const months = eachMonthOfInterval({ start: startDate, end: now });
      labels = months.map((m) => format(m, groupFormat));
      labels.forEach((l) => (dataMap[l] = 0));
      payments.forEach((p) => {
        if (p.paidAt) {
          const key = format(p.paidAt, groupFormat);
          dataMap[key] = (dataMap[key] || 0) + Number(p.platformFee);
        }
      });
    }

    const totalEarnings = payments.reduce((sum, p) => sum + Number(p.platformFee), 0);

    return {
      success: true,
      data: {
        period,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        currency: 'JMD',
        chart: labels.map((label) => ({
          label,
          amount: Math.round((dataMap[label] || 0) * 100) / 100,
        })),
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 4. APPROVAL REQUESTS
  // ─────────────────────────────────────────────────────────────
  async getApprovalRequests(
    type: 'JOB_SEEKER' | 'EMPLOYER' | 'COMPANY' = 'JOB_SEEKER',
    limit: number = 10,
  ) {
    const roleMap = {
      JOB_SEEKER: UserRole.JOB_SEEKER,
      EMPLOYER: UserRole.EMPLOYER,
      COMPANY: UserRole.COMPANY,
    };

    const users = await this.prisma.user.findMany({
      where: {
        role: roleMap[type],
        status: UserStatus.PENDING,
      },
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        status: true,
        createdAt: true,
        jobSeekerProfile:
          type === 'JOB_SEEKER'
            ? {
              select: {
                fullName: true,
                profilePic: true,
                idCardFront: true,
                idCardBack: true,
                selfieImage: true,
                resumeUrl: true,
                preferredJobCategories: {  // ← Category[] relation
                  select: {
                    name: true,
                  },
                },
              },
            }
            : false,
        employerProfile:
          type === 'EMPLOYER' || type === 'COMPANY'
            ? {
              select: {
                fullName: true,
                companyName: true,
                profilePic: true,
                idCardFront: true,
                idCardBack: true,
                licenseFile: true,
              },
            }
            : false,
      },
    });

    const formatted = users.map((u) => {
      const profile = u.jobSeekerProfile || u.employerProfile;

      // ← Fix: preferredJobCategories 
      const categories = (u.jobSeekerProfile as any)?.preferredJobCategories?.map(
        (c: { name: string }) => c.name
      ) ?? [];

      return {
        userId: u.id,
        fullName: profile?.fullName ?? 'N/A',
        email: u.email,
        registrationDate: u.createdAt,
        category: categories.length > 0 ? categories.join(', ') : null,
        verificationStatus: u.status,
        profilePic: profile?.profilePic ?? null,
        hasDocuments: !!(
          (u.jobSeekerProfile?.idCardFront || u.employerProfile?.idCardFront) &&
          (u.jobSeekerProfile?.selfieImage || u.employerProfile?.idCardBack)
        ),
      };
    });

    return {
      success: true,
      data: formatted,
      meta: {
        type,
        count: formatted.length,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 5. RECENT INTERVIEWS
  // ─────────────────────────────────────────────────────────────
  async getRecentInterviews(limit: number = 10) {
    const interviews = await this.prisma.interview.findMany({
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        scheduleDate: true,
        scheduleTime: true,
        status: true,
        interviewType: true,
        application: {
          select: {
            job: {
              select: {
                title: true,
                employer: {
                  select: {
                    companyName: true,
                    fullName: true,
                  },
                },
              },
            },
            jobSeeker: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    });

    const formatted = interviews.map((i) => ({
      interviewId: i.id,
      jobTitle: i.application.job.title,
      jobSeekerName: i.application.jobSeeker.fullName,
      employerOrCompany:
        i.application.job.employer.companyName || i.application.job.employer.fullName,
      interviewDateTime: `${i.scheduleTime ?? ''}, ${new Date(i.scheduleDate).toLocaleDateString('en-GB')}`,
      scheduleDate: i.scheduleDate,
      scheduleTime: i.scheduleTime,
      status: i.status,
      interviewType: i.interviewType,
    }));

    return {
      success: true,
      data: formatted,
      meta: {
        count: formatted.length,
      },
    };
  }
}