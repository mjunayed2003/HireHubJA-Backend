import {
    Injectable,
    UnauthorizedException,
    ForbiddenException,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/auth.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UserRole, UserStatus } from '../../generated/prisma/client';

@Injectable()
export class AdminAuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    // ─────────────────────────────────────────────────────
    // ADMIN LOGIN
    // ─────────────────────────────────────────────────────
    async adminLogin(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
            include: { adminProfile: true },
        });

        if (!user) throw new UnauthorizedException('Invalid email or password');

        if (user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Access denied. Admin only.');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
        if (!isPasswordValid) throw new UnauthorizedException('Invalid email or password');

        if (user.status === UserStatus.BLOCKED) {
            throw new ForbiddenException('Your admin account has been blocked.');
        }

        const payload = { sub: user.id, email: user.email, role: user.role };
        const token = await this.jwtService.signAsync(payload);

        return {
            message: 'Admin login successful',
            access_token: token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                fullName: user.adminProfile?.fullName ?? '',
                profilePic: user.adminProfile?.profilePic ?? null,
            },
        };
    }

    // ─────────────────────────────────────────────────────
    // ADD NEW ADMIN
    // ─────────────────────────────────────────────────────
    async createAdmin(dto: CreateAdminDto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existing) throw new ConflictException('Email already exists');

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const newAdmin = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: hashedPassword,
                role: UserRole.ADMIN,
                status: UserStatus.ACTIVE,
                adminProfile: {
                    create: {
                        fullName: dto.fullName,
                    },
                },
            },
            include: { adminProfile: true },
        });

        const { password, ...result } = newAdmin;
        return {
            message: 'New admin created successfully',
            admin: {
                id: result.id,
                email: result.email,
                role: result.role,
                fullName: result.adminProfile?.fullName,
            },
        };
    }



    async deleteAdmin(targetId: string, requesterId: string) {
        // connot delete self
        if (targetId === requesterId) {
            throw new ForbiddenException('You cannot delete your own account');
        }

        // chack admin exist admin
        const admin = await this.prisma.user.findUnique({
            where: { id: targetId },
            include: { adminProfile: true },
        });

        if (!admin) throw new NotFoundException('Admin not found');

        if (admin.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Target user is not an admin');
        }

        // Delete  Cascade and adminProfile
        await this.prisma.user.delete({ where: { id: targetId } });

        return {
            message: `Admin deleted successfully`,
        };
    }

}