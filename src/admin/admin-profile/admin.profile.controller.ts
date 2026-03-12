import {
  Controller,
  Get,
  Put,
  Body,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminProfileService } from './admin.profile.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from '../admin-auth/guards/roles.guard';
import { Roles } from '../admin-auth/decorators/roles.decorator';
import { UserRole } from 'src/generated/prisma/client';
import { UpdateAdminProfileDto } from './dto/update-admin-profile.dto';

@Controller('admin/profile')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminProfileController {
  constructor(private readonly adminProfileService: AdminProfileService) {}

  // ─────────────────────────────────────────────────────
  // GET /admin/profile
  // ─────────────────────────────────────────────────────
  @Get()
  getProfile(@Request() req) {
    return this.adminProfileService.getProfile(req.user.id);
  }

  // ─────────────────────────────────────────────────────
  // PUT /admin/profile
  // ─────────────────────────────────────────────────────
  @Put()
  @UseInterceptors(FileInterceptor('profilePic'))
  updateProfile(
    @Request() req,
    @Body() dto: UpdateAdminProfileDto,
    @UploadedFile() profilePic?: Express.Multer.File,
  ) {
    return this.adminProfileService.updateProfile(req.user.id, dto, profilePic);
  }
}