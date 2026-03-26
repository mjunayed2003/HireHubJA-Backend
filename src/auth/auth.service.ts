import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserRole } from '../generated/prisma/client';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  JobSeekerBasicDto,
  JobSeekerEducationDto,
  JobSeekerProfessionalDto,
  EmployerBasicDto,
  CompanyBasicDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private readonly mailService: MailerService,
  ) {}

  // ─────────────────────────────────────────────────────
  // HELPER — Temp Token (short lived 15 min)
  // ─────────────────────────────────────────────────────
  private async generateTempToken(userId: string, email: string, role: string) {
    return this.jwtService.signAsync(
      { sub: userId, email, role, type: 'temp' },
      { expiresIn: '15m' },
    );
  }

  // ─────────────────────────────────────────────────────
  // HELPER — Main Token (long lived 7 days)
  // ─────────────────────────────────────────────────────
  private async generateMainToken(userId: string, email: string, role: string) {
    return this.jwtService.signAsync(
      { sub: userId, email, role, type: 'main' },
      { expiresIn: '7d' },
    );
  }

  // ─────────────────────────────────────────────────────
  // 1. REGISTER -> Returns tempToken
  // ─────────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) throw new BadRequestException('Email already exists!');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 1);

    const role = dto.role as UserRole;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        role,
        status: 'ACTIVE',
        isVerified: false,
        otpCode: otp,
        otpExpiry,
        ...(role === UserRole.JOB_SEEKER && {
          jobSeekerProfile: { create: { fullName: dto.fullName } },
        }),
        ...((role === UserRole.EMPLOYER || role === UserRole.COMPANY) && {
          employerProfile: {
            create: {
              fullName: dto.fullName,
              companyName: dto.companyName || null,
            },
          },
        }),
      },
    });

    // Send OTP email
    try {
      await this.mailService.sendMail({
        to: dto.email,
        subject: 'Verify Your Email - HireHubJA',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <h2 style="color: #3FAE2A;">Welcome to HireHubJA!</h2>
            <p>Hello ${dto.fullName},</p>
            <p>Please verify your email using the OTP below:</p>
            <h1 style="color: #3FAE2A; letter-spacing: 5px;">${otp}</h1>
            <p>This code will expire in <b>1 minute</b>.</p>
            <br>
            <p>Best Regards,<br>HireHubJA Team</p>
          </div>
        `,
      });
    } catch {
      throw new BadRequestException('Failed to send OTP email');
    }

    // Temp token - for OTP verification
    const tempToken = await this.generateTempToken(user.id, user.email, user.role);

    return {
      success: true,
      message: 'Registration successful. Please verify your email.',
      tempToken,
      role: user.role,
    };
  }

  // ─────────────────────────────────────────────────────
  // 2. VERIFY OTP -> Returns main token
  // Header: Authorization: Bearer {{tempToken}}
  // ─────────────────────────────────────────────────────
  async verifyOtp(userId: string, otp: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.isVerified) throw new BadRequestException('Email already verified');

    if (!user.otpCode || user.otpCode !== otp) {
      throw new BadRequestException('Invalid OTP');
    }
    if (!user.otpExpiry || new Date() > user.otpExpiry) {
      throw new BadRequestException('OTP expired. Please resend.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, otpCode: null, otpExpiry: null },
    });

    // Main token - for subsequent profile updates
    const token = await this.generateMainToken(user.id, user.email, user.role);

    return {
      success: true,
      message: 'Email verified. Please complete your profile.',
      token,
      role: user.role,
    };
  }

  // ─────────────────────────────────────────────────────
  // 3. RESEND OTP
  // Header: Authorization: Bearer {{tempToken}}
  // ─────────────────────────────────────────────────────
  async resendOtp(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');
    if (user.isVerified) throw new BadRequestException('Email already verified');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 1);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpCode: otp, otpExpiry },
    });

    try {
      await this.mailService.sendMail({
        to: user.email,
        subject: 'New OTP - HireHubJA',
        html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #3FAE2A;">New OTP Code</h2>
          <h1 style="color: #3FAE2A; letter-spacing: 5px;">${otp}</h1>
          <p>Expires in <b>1 minute</b>.</p>
        </div>
      `,
      });
    } catch {
      throw new BadRequestException('Failed to send OTP');
    }

    const tempToken = await this.generateTempToken(user.id, user.email, user.role);

    return {
      success: true,
      message: 'OTP resent successfully.',
      tempToken,
    };
  }

  // ─────────────────────────────────────────────────────
  // 4. JOB SEEKER — Step 3: Basic Info
  // ─────────────────────────────────────────────────────
  async updateJobSeekerBasic(userId: string, dto: JobSeekerBasicDto, profilePicFile?: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { jobSeekerProfile: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.JOB_SEEKER) throw new BadRequestException('Not a job seeker account');

    const categories = typeof dto.preferredJobCategoryIds === 'string' ? JSON.parse(dto.preferredJobCategoryIds) : (dto.preferredJobCategoryIds || []);
    const employmentType = typeof dto.employmentType === 'string' ? JSON.parse(dto.employmentType) : (dto.employmentType || []);
    const profilePic = profilePicFile ? `/uploads/${profilePicFile.filename}` : undefined;

    try {
      await this.prisma.jobSeekerProfile.upsert({
        where: { userId },
        update: {
          phone: dto.phone,
          location: dto.location,
          about: dto.about,
          gender: dto.gender,
          dob: dto.dob ? new Date(dto.dob) : null,
          employmentType,
          ...(profilePic && { profilePic }),
          ...(categories.length > 0 && {
            preferredJobCategories: { set: categories.map((id: string) => ({ id })) },
          }),
        },
        create: {
          userId,
          fullName: user.jobSeekerProfile?.fullName || 'User',
          phone: dto.phone,
          location: dto.location,
          about: dto.about,
          gender: dto.gender,
          dob: dto.dob ? new Date(dto.dob) : null,
          employmentType,
          ...(profilePic && { profilePic }),
          ...(categories.length > 0 && {
            preferredJobCategories: { connect: categories.map((id: string) => ({ id })) },
          }),
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new BadRequestException('One or more Preferred Job Category IDs are invalid or do not exist.');
      }
      throw error;
    }

    return { success: true, message: 'Basic info saved.' };
  }

  // ─────────────────────────────────────────────────────
  // 5. JOB SEEKER — Step 4: Education
  // ─────────────────────────────────────────────────────
  async updateJobSeekerEducation(userId: string, dto: JobSeekerEducationDto) {
    const profile = await this.prisma.jobSeekerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');

    const education = typeof dto.education === 'string' ? JSON.parse(dto.education) : (dto.education || []);

    await this.prisma.jobSeekerProfile.update({
      where: { userId },
      data: {
        education: {
          deleteMany: {},
          create: education.map((edu: any) => ({
            degreeName: edu.degreeName,
            institution: edu.institution,
            startDate: new Date(edu.startDate),
            completionYear: edu.completionYear ? new Date(edu.completionYear) : null,
            isCurrent: edu.isCurrent || false,
          })),
        },
      },
    });

    return { success: true, message: 'Education saved.' };
  }

  // ─────────────────────────────────────────────────────
  // 6. JOB SEEKER — Step 5: Professional
  // ─────────────────────────────────────────────────────
  async updateJobSeekerProfessional(userId: string, dto: JobSeekerProfessionalDto, files: any) {
    const profile = await this.prisma.jobSeekerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');

    const skills = typeof dto.skills === 'string' ? JSON.parse(dto.skills) : (dto.skills || []);
    const experience = typeof dto.experience === 'string' ? JSON.parse(dto.experience) : (dto.experience || []);
    const resumeUrl = files?.resume?.[0] ? `/uploads/${files.resume[0].filename}` : undefined;

    await this.prisma.jobSeekerProfile.update({
      where: { userId },
      data: {
        experienceLevel: dto.experienceLevel,
        skills,
        ...(resumeUrl && { resumeUrl }),
        experience: {
          deleteMany: {},
          create: experience.map((exp: any) => ({
            designation: exp.designation,
            companyName: exp.companyName,
            startDate: new Date(exp.startDate),
            endDate: exp.endDate ? new Date(exp.endDate) : null,
            isCurrent: exp.isCurrent || false,
            description: exp.description,
          })),
        },
      },
    });

    return { success: true, message: 'Professional details saved.' };
  }

  // ─────────────────────────────────────────────────────
  // 7. JOB SEEKER — Step 6: Verification
  // ─────────────────────────────────────────────────────
  async updateJobSeekerVerification(userId: string, files: any) {
    const profile = await this.prisma.jobSeekerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');

    const idCardFront = files?.idCardFront?.[0] ? `/uploads/${files.idCardFront[0].filename}` : undefined;
    const idCardBack = files?.idCardBack?.[0] ? `/uploads/${files.idCardBack[0].filename}` : undefined;
    const selfieImage = files?.selfieImage?.[0] ? `/uploads/${files.selfieImage[0].filename}` : undefined;

    await this.prisma.jobSeekerProfile.update({
      where: { userId },
      data: {
        ...(idCardFront && { idCardFront }),
        ...(idCardBack && { idCardBack }),
        ...(selfieImage && { selfieImage }),
      },
    });

    return { success: true, message: 'Verification documents uploaded. Account pending approval.' };
  }

  // ─────────────────────────────────────────────────────
  // 8. EMPLOYER — Step 3: Basic Info
  // ─────────────────────────────────────────────────────
  async updateEmployerBasic(userId: string, dto: EmployerBasicDto, profilePicFile?: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employerProfile: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.EMPLOYER) throw new BadRequestException('Not an employer account');

    const profilePic = profilePicFile ? `/uploads/${profilePicFile.filename}` : undefined;

    await this.prisma.employerProfile.upsert({
      where: { userId },
      update: {
        phone: dto.phone,
        location: dto.location,
        about: dto.about,
        ...(profilePic && { profilePic }),
      },
      create: {
        userId,
        fullName: user.employerProfile?.fullName || 'Employer',
        phone: dto.phone,
        location: dto.location,
        about: dto.about,
        ...(profilePic && { profilePic }),
      },
    });

    return { success: true, message: 'Basic info saved.' };
  }

  // ─────────────────────────────────────────────────────
  // 9. EMPLOYER — Step 4: Verification
  // ─────────────────────────────────────────────────────
  async updateEmployerVerification(userId: string, files: any) {
    const profile = await this.prisma.employerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');

    const idCardFront = files?.idCardFront?.[0] ? `/uploads/${files.idCardFront[0].filename}` : undefined;
    const idCardBack = files?.idCardBack?.[0] ? `/uploads/${files.idCardBack[0].filename}` : undefined;

    await this.prisma.employerProfile.update({
      where: { userId },
      data: {
        ...(idCardFront && { idCardFront }),
        ...(idCardBack && { idCardBack }),
      },
    });

    return { success: true, message: 'Verification documents uploaded. Account pending approval.' };
  }

  // ─────────────────────────────────────────────────────
  // 10. COMPANY — Step 3: Basic Info
  // ─────────────────────────────────────────────────────
  async updateCompanyBasic(userId: string, dto: CompanyBasicDto, profilePicFile?: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employerProfile: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.COMPANY) throw new BadRequestException('Not a company account');

    const profilePic = profilePicFile ? `/uploads/${profilePicFile.filename}` : undefined;

    await this.prisma.employerProfile.upsert({
      where: { userId },
      update: {
        phone: dto.phone,
        location: dto.location,
        about: dto.about,
        businessRegCertId: dto.businessRegCertId,
        taxId: dto.taxId,
        authorizedRepId: dto.authorizedRepId,
        ...(profilePic && { profilePic }),
      },
      create: {
        userId,
        fullName: user.employerProfile?.fullName || 'Company Name',
        companyName: user.employerProfile?.companyName || 'Company Name',
        phone: dto.phone,
        location: dto.location,
        about: dto.about,
        businessRegCertId: dto.businessRegCertId,
        taxId: dto.taxId,
        authorizedRepId: dto.authorizedRepId,
        ...(profilePic && { profilePic }),
      },
    });

    return { success: true, message: 'Company info saved.' };
  }

  // ─────────────────────────────────────────────────────
  // 11. COMPANY — Step 4: Verification
  // ─────────────────────────────────────────────────────
  async updateCompanyVerification(userId: string, files: any) {
    const profile = await this.prisma.employerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');

    const licenseFile = files?.licenseFile?.[0] ? `/uploads/${files.licenseFile[0].filename}` : undefined;

    await this.prisma.employerProfile.update({
      where: { userId },
      data: { ...(licenseFile && { licenseFile }) },
    });

    return { success: true, message: 'Business certificate uploaded. Account pending approval.' };
  }

  // ─────────────────────────────────────────────────────
  // 12. LOGIN
  // ─────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        jobSeekerProfile: true,
        employerProfile: true,
        adminProfile: true,
      },
    });

    if (!user) throw new UnauthorizedException('Invalid email or password');

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid email or password');

    if (!user.isVerified) throw new ForbiddenException('Please verify your email first.');
    if (user.status === 'PENDING') throw new ForbiddenException('Your account is waiting for Admin Approval.');
    if (user.status === 'BLOCKED' || user.status === 'REJECTED') {
      throw new ForbiddenException('Your account has been blocked or rejected.');
    }

    const token = await this.generateMainToken(user.id, user.email, user.role);

    let fullName = '';
    let profilePic: string | null = null;

    if (user.role === UserRole.JOB_SEEKER && user.jobSeekerProfile) {
      fullName = user.jobSeekerProfile.fullName;
      profilePic = user.jobSeekerProfile.profilePic;
    } else if ((user.role === UserRole.EMPLOYER || user.role === UserRole.COMPANY) && user.employerProfile) {
      fullName = user.employerProfile.fullName;
      profilePic = user.employerProfile.profilePic;
    } else if (user.role === UserRole.ADMIN && user.adminProfile) {
      fullName = user.adminProfile.fullName;
      profilePic = user.adminProfile.profilePic;
    }

    return {
      success: true,
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, role: user.role, status: user.status, fullName, profilePic },
    };
  }

  // ─────────────────────────────────────────────────────
  // 13. LOGOUT
  // ─────────────────────────────────────────────────────
  async logout(userId: string) {
    return { success: true, message: 'Logged out successfully' };
  }

  // ─────────────────────────────────────────────────────
  // 14. FORGOT PASSWORD -> Returns tempToken
  // ─────────────────────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('User not found');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 1);

    await this.prisma.user.update({
      where: { email: dto.email },
      data: { otpCode: otp, otpExpiry },
    });

    try {
      await this.mailService.sendMail({
        to: dto.email,
        subject: 'Password Reset OTP - HireHubJA',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #3FAE2A;">Password Reset</h2>
            <p>Your OTP code:</p>
            <h1 style="color: #3FAE2A; letter-spacing: 5px;">${otp}</h1>
            <p>Expires in <b>1 minute</b>.</p>
          </div>
        `,
      });
    } catch {
      throw new BadRequestException('Failed to send OTP');
    }

    // Temp token - for OTP verification
    const tempToken = await this.generateTempToken(user.id, user.email, user.role);

    return {
      success: true,
      message: 'OTP sent to your email.',
      tempToken,
    };
  }

  // ─────────────────────────────────────────────────────
  // 15. VERIFY FORGOT PASSWORD OTP -> Returns resetToken
  // Header: Authorization: Bearer {{tempToken}}
  // ─────────────────────────────────────────────────────
  async verifyForgotPasswordOtp(userId: string, otp: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (!user.otpCode || user.otpCode !== otp) throw new BadRequestException('Invalid OTP');
    if (!user.otpExpiry || new Date() > user.otpExpiry) throw new BadRequestException('OTP expired.');

    const resetToken = crypto.randomBytes(32).toString('hex');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpCode: null, otpExpiry: null, resetToken },
    });

    // Reset token - to set new password
    const token = await this.generateMainToken(user.id, user.email, user.role);

    return {
      success: true,
      message: 'OTP verified. Use reset token to set new password.',
      resetToken,
    };
  }

  // ─────────────────────────────────────────────────────
  // 16. RESET PASSWORD
  // Header: Authorization: Bearer {{tempToken}}
  // ─────────────────────────────────────────────────────
  async resetPassword(userId: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.resetToken) throw new BadRequestException('Invalid or expired reset token');

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, resetToken: null },
    });

    return { success: true, message: 'Password reset successfully. You can now login.' };
  }

  // ─────────────────────────────────────────────────────
  // 17. RESEND FORGOT PASSWORD OTP
  // ─────────────────────────────────────────────────────
  async resendForgotPasswordOtpByEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 1);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpCode: otp, otpExpiry },
    });

    try {
      await this.mailService.sendMail({
        to: user.email,
        subject: 'New OTP - HireHubJA',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #3FAE2A;">New OTP Code</h2>
            <h1 style="color: #3FAE2A; letter-spacing: 5px;">${otp}</h1>
            <p>Expires in <b>1 minute</b>.</p>
          </div>
        `,
      });
    } catch {
      throw new BadRequestException('Failed to send OTP');
    }

    const tempToken = await this.generateTempToken(user.id, user.email, user.role);

    return {
      success: true,
      message: 'OTP resent successfully.',
      tempToken,
    };
  }
}