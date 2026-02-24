import { Body, Controller, Post, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { RegisterJobSeekerDto } from './dto/register-job-seeker.dto';
import { RegisterEmployerDto } from './dto/register-employer.dto';
import type { Multer } from 'multer';
import { ForgotPasswordDto, LoginDto, ResetPasswordDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UploadedFiles, UseInterceptors } from '@nestjs/common';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ============================================
  // 1. JOB SEEKER REGISTRATION
  // ============================================
  @Post('register/job-seeker')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'profilePic', maxCount: 1 },
      { name: 'resume', maxCount: 1 },
      { name: 'idCardFront', maxCount: 1 },
      { name: 'idCardBack', maxCount: 1 },
      { name: 'selfieImage', maxCount: 1 },
    ]),
  )
  async registerJobSeeker(
    @Body() dto: RegisterJobSeekerDto,
    @UploadedFiles() files: { 
      profilePic?: Multer.File[], 
      resume?: Multer.File[],
      idCardFront?: Multer.File[],
      idCardBack?: Multer.File[],
      selfieImage?: Multer.File[]
    },
  ) {
    return this.authService.registerJobSeeker(dto, files);
  }

  // ============================================
  // 2. EMPLOYER / COMPANY REGISTRATION
  // ============================================
  @Post('register/employer')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'profilePic', maxCount: 1 }, // Company Logo
      { name: 'licenseFile', maxCount: 1 }, // Trade License
      { name: 'idCardFront', maxCount: 1 }, // Contact Person ID
      { name: 'idCardBack', maxCount: 1 },
    ]),
  )
  async registerEmployer(
    @Body() dto: RegisterEmployerDto,
    @UploadedFiles() files: { 
      profilePic?: Multer.File[], 
      licenseFile?: Multer.File[],
      idCardFront?: Multer.File[],
      idCardBack?: Multer.File[]
    },
  ) {
    return this.authService.registerEmployer(dto, files);
  }


    @Post('login')
  @HttpCode(HttpStatus.OK) // 200 OK 
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ==========================================
  // ✅ LOGOUT ROUTE (Protected)
  // ==========================================
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req) {
    
    return this.authService.logout(req.user.id); 
  }





    // ==========================================
  // 🔑 FORGOT PASSWORD & RESET
  // ==========================================
  
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}