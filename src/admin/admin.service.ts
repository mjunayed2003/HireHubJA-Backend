import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserStatus } from '@prisma/client';
import { RejectUserDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // all pending users with pagination
  async getPendingUsers(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { status: UserStatus.PENDING },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,

          jobSeekerProfile: {
            select: { fullName: true, profilePic: true, location: true }
          },

          employerProfile: {
            select: { companyName: true, fullName: true, isVerified: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.user.count({ where: { status: UserStatus.PENDING } }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  //(View Details)
  async getUserDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        jobSeekerProfile: true,
        employerProfile: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async approveUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { 
        status: UserStatus.ACTIVE,
        // isVerified
        employerProfile: {
           update: {
             isVerified: true
           }
        }
      },
    });
  }

  //  (Decline/Reject)
  async rejectUser(userId: string, dto: RejectUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.REJECTED,
        rejectionReason: dto.reason,
      },
    });
  }
}