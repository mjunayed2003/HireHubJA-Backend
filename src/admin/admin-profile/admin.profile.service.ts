import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateAdminProfileDto } from './dto/update-admin-profile.dto';

@Injectable()
export class AdminProfileService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────
  // GET PROFILE
  // ─────────────────────────────────────────────────────
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        adminProfile: {
          select: {
            id: true,
            fullName: true,
            profilePic: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Admin not found');

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        fullName: user.adminProfile?.fullName ?? '',
        profilePic: user.adminProfile?.profilePic ?? null,
      },
    };
  }

  // ─────────────────────────────────────────────────────
  // UPDATE PROFILE
  // ─────────────────────────────────────────────────────
  async updateProfile(
    userId: string,
    dto: UpdateAdminProfileDto,
    profilePicFile?: Express.Multer.File,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { adminProfile: true },
    });

    if (!user?.adminProfile) throw new NotFoundException('Admin profile not found');

    const profilePic = profilePicFile
      ? `/uploads/${profilePicFile.filename}`
      : user.adminProfile.profilePic;

    const updated = await this.prisma.adminProfile.update({
      where: { userId },
      data: {
        fullName: dto.fullName ?? user.adminProfile.fullName,
        profilePic,
      },
    });

    return {
      success: true,
      message: 'Profile updated successfully',
      data: {
        fullName: updated.fullName,
        profilePic: updated.profilePic,
      },
    };
  }
}