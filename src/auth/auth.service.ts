import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterJobSeekerDto } from './dto/register-job-seeker.dto';
import { RegisterEmployerDto } from './dto/register-employer.dto';
import { UserRole } from '../generated/prisma/client';
import { LoginDto } from './dto/auth.dto';
import { JwtService } from '@nestjs/jwt';


@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  // ----------------------------------------------------
  // JOB SEEKER REGISTRATION
  // ----------------------------------------------------
  async registerJobSeeker(dto: RegisterJobSeekerDto, files: any) {

    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) throw new BadRequestException('Email already exists!');


    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const skills = dto.skills ? JSON.parse(dto.skills) : [];
    const education = dto.education ? JSON.parse(dto.education) : [];
    const experience = dto.experience ? JSON.parse(dto.experience) : [];
    const categories = dto.preferredJobCategoryIds ? JSON.parse(dto.preferredJobCategoryIds) : [];
    
  
    const profilePic = files.profilePic ? `/uploads/${files.profilePic[0].filename}` : null;
    const resumeUrl = files.resume ? `/uploads/${files.resume[0].filename}` : null;
    const idCardFront = files.idCardFront ? `/uploads/${files.idCardFront[0].filename}` : null;
    const idCardBack = files.idCardBack ? `/uploads/${files.idCardBack[0].filename}` : null;
    const selfieImage = files.selfieImage ? `/uploads/${files.selfieImage[0].filename}` : null;

    // Databse save
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        role: UserRole.JOB_SEEKER,
        status: 'PENDING',
        
        jobSeekerProfile: {
          create: {
            fullName: dto.fullName,
            phone: dto.phone,
            about: dto.about,
            location: dto.location,
            experienceLevel: dto.experienceLevel,
            skills: skills,
            
            // Files
            profilePic, resumeUrl, idCardFront, idCardBack, selfieImage,
            
            // Relations
            education: {
              create: education.map(edu => ({
                degreeName: edu.degreeName,
                institution: edu.institution,
                startDate: new Date(edu.startDate), // Date convert
                completionYear: edu.completionYear ? new Date(edu.completionYear) : null,
                isCurrent: edu.isCurrent || false,
              }))
            },
            experience: {
              create: experience.map(exp => ({
                designation: exp.designation,
                companyName: exp.companyName,
                startDate: new Date(exp.startDate),
                endDate: exp.endDate ? new Date(exp.endDate) : null,
                isCurrent: exp.isCurrent || false,
                description: exp.description
              }))
            },
            preferredJobCategories: {
                connect: categories.map((id) => ({ id })),
            }
          }
        }
      },
      include: {
        jobSeekerProfile: {
            include: { education: true, experience: true }
        }
      }
    });

    const { password, ...result } = user;
    return { message: 'Job Seeker Registration successful', user: result };
  }

  // ----------------------------------------------------
  // EMPLOYER / COMPANY REGISTRATION
  // ----------------------------------------------------
  async registerEmployer(dto: RegisterEmployerDto, files: any) {
    // email check
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) throw new BadRequestException('Email already exists!');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const profilePic = files.profilePic ? `/uploads/${files.profilePic[0].filename}` : null;
    const licenseFile = files.licenseFile ? `/uploads/${files.licenseFile[0].filename}` : null;
    const idCardFront = files.idCardFront ? `/uploads/${files.idCardFront[0].filename}` : null;
    const idCardBack = files.idCardBack ? `/uploads/${files.idCardBack[0].filename}` : null;

    const role = dto.role || UserRole.EMPLOYER;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        role: role, 
        status: 'PENDING',

        employerProfile: {
          create: {
            fullName: dto.fullName,
            companyName: dto.companyName,
            phone: dto.phone,
            location: dto.location,
            about: dto.about,
            website: dto.website,
            
            // Files
            profilePic, licenseFile, idCardFront, idCardBack,
            
            isVerified: false
          }
        }
      }
    });

    const { password, ...result } = user;
    return { message: 'Employer Registration successful', user: result };
  }



  // ==========================================
  // ✅ LOGIN METHOD (UPDATED)
  // ==========================================
  async login(dto: LoginDto) {
    // find user and include profiles
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        jobSeekerProfile: true, // Job Seeker profile include
        employerProfile: true,  // Employer profile include
        adminProfile: true,     // Admin profile include
      },
    });

    if (!user) throw new UnauthorizedException('Invalid email or password');

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid email or password');

    if (user.status === 'PENDING') {
      throw new ForbiddenException('Your account is waiting for Admin Approval.');
    }
    if (user.status === 'BLOCKED' || user.status === 'REJECTED') {
      throw new ForbiddenException('Your account has been blocked or rejected.');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = await this.jwtService.signAsync(payload);

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
      message: 'Login successful',
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        fullName: fullName,
        profilePic: profilePic, 
      },
    };
  }

  // ==========================================
  // ✅ LOGOUT METHOD
  // ==========================================
  async logout(userId: string) {
    
    return { message: 'Logged out successfully' };
  }
}
