import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
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

const storage = diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
  },
});

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  // ─────────────────────────────────────────────────────
  // 1. REGISTER -> tempToken
  // POST /auth/register
  // ─────────────────────────────────────────────────────
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // ─────────────────────────────────────────────────────
  // 2. VERIFY OTP -> main token
  // ─────────────────────────────────────────────────────
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body() body: { otp: string; email?: string },
    @Request() req,
  ) {
    // ✅ email থাকলে সরাসরি email flow — token ignore
    if (body.email) {
      return this.authService.verifyOtpByEmail(body.email, body.otp);
    }

    // ✅ email না থাকলে token flow
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = this.jwtService.decode(token) as any;
        if (decoded?.sub) {
          return this.authService.verifyOtp(decoded.sub, body.otp);
        }
      } catch {}
    }

    throw new BadRequestException('Email or token required');
  }

  // ─────────────────────────────────────────────────────
  // 3. RESEND OTP
  // POST /auth/resend-otp
  // ─────────────────────────────────────────────────────
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() body: { email?: string }, @Request() req) {
    // ✅ email থাকলে সরাসরি email flow
    if (body.email) {
      return this.authService.resendOtp(body.email);
    }

    // ✅ email না থাকলে token flow
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = this.jwtService.decode(token) as any;
        if (decoded?.email) {
          return this.authService.resendOtp(decoded.email);
        }
      } catch {}
    }

    throw new BadRequestException('Email or token required');
  }

  // ═══════════════════════════════════════════════════
  // JOB SEEKER STEPS — Authorization: Bearer {{token}}
  // ═══════════════════════════════════════════════════

  @UseGuards(JwtAuthGuard)
  @Post('profile/job-seeker/basic')
  @UseInterceptors(FileInterceptor('profilePic', { storage }))
  async jobSeekerBasic(
    @Body() dto: JobSeekerBasicDto,
    @UploadedFile() profilePic: Express.Multer.File,
    @Request() req,
  ) {
    return this.authService.updateJobSeekerBasic(req.user.id, dto, profilePic);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile/job-seeker/education')
  async jobSeekerEducation(@Body() dto: JobSeekerEducationDto, @Request() req) {
    return this.authService.updateJobSeekerEducation(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile/job-seeker/professional')
  @UseInterceptors(FileInterceptor('resume', { storage }))
  async jobSeekerProfessional(
    @Body() dto: JobSeekerProfessionalDto,
    @UploadedFile() resume: Express.Multer.File,
    @Request() req,
  ) {
    return this.authService.updateJobSeekerProfessional(req.user.id, dto, {
      resume: resume ? [resume] : [],
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile/job-seeker/verification')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'idCardFront', maxCount: 1 },
        { name: 'idCardBack', maxCount: 1 },
        { name: 'selfieImage', maxCount: 1 },
      ],
      { storage },
    ),
  )
  async jobSeekerVerification(
    @UploadedFiles()
    files: {
      idCardFront?: Express.Multer.File[];
      idCardBack?: Express.Multer.File[];
      selfieImage?: Express.Multer.File[];
    },
    @Request() req,
  ) {
    return this.authService.updateJobSeekerVerification(req.user.id, files);
  }

  // ═══════════════════════════════════════════════════
  // EMPLOYER STEPS
  // ═══════════════════════════════════════════════════

  @UseGuards(JwtAuthGuard)
  @Post('profile/employer/basic')
  @UseInterceptors(FileInterceptor('profilePic', { storage }))
  async employerBasic(
    @Body() dto: EmployerBasicDto,
    @UploadedFile() profilePic: Express.Multer.File,
    @Request() req,
  ) {
    return this.authService.updateEmployerBasic(req.user.id, dto, profilePic);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile/employer/verification')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'idCardFront', maxCount: 1 },
        { name: 'idCardBack', maxCount: 1 },
        { name: 'selfieImage', maxCount: 1 },
      ],
      { storage },
    ),
  )
  async employerVerification(
    @UploadedFiles()
    files: {
      idCardFront?: Express.Multer.File[];
      idCardBack?: Express.Multer.File[];
      selfieImage?: Express.Multer.File[];
    },
    @Request() req,
  ) {
    return this.authService.updateEmployerVerification(req.user.id, files);
  }

  // ═══════════════════════════════════════════════════
  // COMPANY STEPS
  // ═══════════════════════════════════════════════════

  @UseGuards(JwtAuthGuard)
  @Post('profile/company/basic')
  @UseInterceptors(FileInterceptor('profilePic', { storage }))
  async companyBasic(
    @Body() dto: CompanyBasicDto,
    @UploadedFile() profilePic: Express.Multer.File,
    @Request() req,
  ) {
    return this.authService.updateCompanyBasic(req.user.id, dto, profilePic);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile/company/verification')
  @UseInterceptors(FileInterceptor('licenseFile', { storage }))
  async companyVerification(
    @UploadedFile() licenseFile: Express.Multer.File,
    @Request() req,
  ) {
    return this.authService.updateCompanyVerification(req.user.id, {
      licenseFile: licenseFile ? [licenseFile] : [],
    });
  }

  // ═══════════════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════════════

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req) {
    return this.authService.logout(req.user.id);
  }

  // ═══════════════════════════════════════════════════
  // FORGOT PASSWORD
  // ═══════════════════════════════════════════════════

  // Step 1 — email দাও -> tempToken পাও
  // POST /auth/forgot-password
  // Body: { email }
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // Step 2 — OTP verify -> resetToken পাও
  // POST /auth/forgot-password/verify-otp
  // ✅ Priority: email body আগে, তারপর tempToken header
  // Option A: Body: { email, otp }              ← frontend flow
  // Option B: Bearer tempToken + Body: { otp }  ← developer/Postman flow
  @Post('forgot-password/verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyForgotPasswordOtp(
    @Body() body: { otp: string; email?: string },
    @Request() req,
  ) {
    // ✅ email থাকলে সরাসরি email flow
    if (body.email) {
      return this.authService.verifyForgotPasswordOtpByEmail(body.email, body.otp);
    }

    // ✅ email না থাকলে token flow
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = this.jwtService.decode(token) as any;
        if (decoded?.sub) {
          return this.authService.verifyForgotPasswordOtp(decoded.sub, body.otp);
        }
      } catch {}
    }

    throw new BadRequestException('Email or token required');
  }

  // Step 2b — OTP resend
  // POST /auth/forgot-password/resend-otp
  // ✅ Priority: email body আগে, তারপর tempToken header
  // Option A: Body: { email }              ← frontend flow
  // Option B: Bearer tempToken             ← developer/Postman flow
  @Post('forgot-password/resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendForgotPasswordOtp(
    @Body() body: { email?: string },
    @Request() req,
  ) {
    // ✅ email থাকলে সরাসরি email flow
    if (body.email) {
      return this.authService.resendForgotPasswordOtpByEmail(body.email);
    }

    // ✅ email না থাকলে token flow
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = this.jwtService.decode(token) as any;
        if (decoded?.sub) {
          return this.authService.resendForgotPasswordOtp(decoded.sub);
        }
      } catch {}
    }

    throw new BadRequestException('Email or token required');
  }

  // Step 3 — Password reset
  // POST /auth/forgot-password/reset
  // Body: { resetToken, newPassword }
  @Post('forgot-password/reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { resetToken: string; newPassword: string }) {
    return this.authService.resetPasswordByToken(body.resetToken, body.newPassword);
  }
}