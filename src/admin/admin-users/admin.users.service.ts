import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, UserStatus } from '../../generated/prisma/client';
import { UsersQueryDto } from './dto/users-query.dto';

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────
  // GET ALL USERS — filter + pagination
  // ─────────────────────────────────────────────────────
  async getUsers(query: UsersQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      role: query.role
        ? (query.role as UserRole)
        : { in: [UserRole.JOB_SEEKER, UserRole.EMPLOYER, UserRole.COMPANY] },
    };

    if (query.status) where.status = query.status as UserStatus;

    // Search by name or email
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        {
          jobSeekerProfile: {
            fullName: { contains: query.search, mode: 'insensitive' },
          },
        },
        {
          employerProfile: {
            fullName: { contains: query.search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          jobSeekerProfile: {
            select: {
              fullName: true,
              profilePic: true,
              phone: true,
              location: true,
              preferredJobCategories: { select: { name: true } },
            },
          },
          employerProfile: {
            select: {
              fullName: true,
              companyName: true,
              profilePic: true,
              phone: true,
              location: true,
            },
          },
        },
      }),
    ]);

    const formatted = users.map((u) => {
      const profile = u.jobSeekerProfile || u.employerProfile;
      return {
        id: u.id,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
        fullName: profile?.fullName ?? 'N/A',
        companyName: u.employerProfile?.companyName ?? null,
        profilePic: profile?.profilePic ?? null,
        phone: profile?.phone ?? null,
        location: profile?.location ?? null,
        categories:
          u.jobSeekerProfile?.preferredJobCategories.map((c) => c.name) ?? [],
      };
    });

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
  // GET USER BY ID — full details + documents
  // ─────────────────────────────────────────────────────
  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
        jobSeekerProfile: {
          select: {
            fullName: true,
            phone: true,
            gender: true,
            dob: true,
            profilePic: true,
            location: true,
            about: true,
            skills: true,
            experienceLevel: true,
            resumeUrl: true,
            // Documents
            idCardFront: true,
            idCardBack: true,
            selfieImage: true,
            preferredJobCategories: { select: { id: true, name: true, image: true } },
            education: true,
            experience: true,
          },
        },
        employerProfile: {
          select: {
            fullName: true,
            companyName: true,
            phone: true,
            profilePic: true,
            location: true,
            about: true,
            website: true,
            // Documents
            idCardFront: true,
            idCardBack: true,
            licenseFile: true,
            businessRegCertId: true,
            taxId: true,
            isVerified: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return { success: true, data: user };
  }

  // ─────────────────────────────────────────────────────
  // APPROVE USER
  // ─────────────────────────────────────────────────────
  async approveUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('User is already active');
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.ACTIVE,
        rejectionReason: null,
      },
    });

    return { success: true, message: 'User approved successfully' };
  }

  // ─────────────────────────────────────────────────────
  // REJECT USER
  // ─────────────────────────────────────────────────────
  async rejectUser(id: string, reason?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.REJECTED,
        rejectionReason: reason ?? null,
      },
    });

    return { success: true, message: 'User rejected successfully' };
  }

  // ─────────────────────────────────────────────────────
  // BLOCK USER
  // ─────────────────────────────────────────────────────
  async blockUser(id: string, reason?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Cannot block an admin user');
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.BLOCKED,
        rejectionReason: reason ?? null,
      },
    });

    return { success: true, message: 'User blocked successfully' };
  }

  // ─────────────────────────────────────────────────────
  // DELETE USER
  // ─────────────────────────────────────────────────────
  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Cannot delete an admin user from this endpoint');
    }

    await this.prisma.user.delete({ where: { id } });

    return { success: true, message: 'User deleted successfully' };
  }
}