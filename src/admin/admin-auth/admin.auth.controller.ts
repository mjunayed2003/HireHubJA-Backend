import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AdminAuthService } from './admin.auth.service';
import { LoginDto } from './dto/auth.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '../../generated/prisma/client';
import { Delete, Param } from '@nestjs/common';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) { }

  // POST /admin/auth/login
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.adminAuthService.adminLogin(dto);
  }

  // POST /admin/auth/create
  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createAdmin(@Body() dto: CreateAdminDto) {
    return this.adminAuthService.createAdmin(dto);
  }


  // admin delete
  @Delete('delete/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteAdmin(@Param('id') id: string, @Request() req) {
    return this.adminAuthService.deleteAdmin(id, req.user.id);
  }





// POST /admin/auth/change-password

  @Post('change-password')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
async changePassword(@Body() dto: ChangePasswordDto, @Request() req) {
  return this.adminAuthService.changePassword(req.user.id, dto);
}

}