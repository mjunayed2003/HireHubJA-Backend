import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../generated/prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // -------------------------
  // REGISTER
  // -------------------------
  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists!');
    }
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          role: dto.role,
          status: 'PENDING',

          jobSeekerProfile:
            dto.role === UserRole.JOB_SEEKER
              ? {
                  create: {
                    fullName: dto.fullName,
                  },
                }
              : undefined,

          employerProfile:
            dto.role === UserRole.EMPLOYER || dto.role === UserRole.COMPANY
              ? {
                  create: {
                    fullName: dto.fullName, // Contact Person Name
                    companyName: dto.companyName || dto.fullName,
                  },
                }
              : undefined,
          
          // ADMIN
          adminProfile: 
            dto.role === UserRole.ADMIN 
            ? {
                create: {
                   fullName: dto.fullName
                }
            } : undefined
        },
      });


      const { password, ...result } = user;
      return { message: 'Registration successful! Please wait for admin approval.', user: result };

    } catch (error) {
      throw new BadRequestException('Something went wrong during registration');
    }
  }

  // -------------------------
  // LOGIN
  // -------------------------
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');
    // check password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    if (user.status === 'PENDING') {
      throw new ForbiddenException('Your account is pending approval from Admin.');
    }
    // check if user is blocked or rejected
    if (user.status === 'BLOCKED' || user.status === 'REJECTED') {
      throw new ForbiddenException('Your account has been blocked or rejected.');
    }

    // create JWT token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = await this.jwtService.signAsync(payload);

    return {
      access_token: token,
      role: user.role,
      status: user.status
    };
  }
}