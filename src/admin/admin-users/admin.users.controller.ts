import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AdminUsersService } from './admin.users.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../admin-auth/guards/roles.guard';
import { Roles } from '../admin-auth/decorators/roles.decorator';
import { UserRole } from '../../generated/prisma/client';
import { UsersQueryDto } from './dto/users-query.dto';
import { RejectUserDto } from './dto/reject-user.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  // ─────────────────────────────────────────────────────
  // GET /admin/users?role=JOB_SEEKER&status=PENDING&page=1&limit=10
  // ─────────────────────────────────────────────────────
  @Get()
  getUsers(@Query() query: UsersQueryDto) {
    return this.adminUsersService.getUsers(query);
  }

  // ─────────────────────────────────────────────────────
  // GET /admin/users/:id
  // ─────────────────────────────────────────────────────
  @Get(':id')
  getUserById(@Param('id') id: string) {
    return this.adminUsersService.getUserById(id);
  }

  // ─────────────────────────────────────────────────────
  // PATCH /admin/users/:id/approve
  // ─────────────────────────────────────────────────────
  @Patch(':id/approve')
  approveUser(@Param('id') id: string) {
    return this.adminUsersService.approveUser(id);
  }

  // ─────────────────────────────────────────────────────
  // PATCH /admin/users/:id/reject
  // ─────────────────────────────────────────────────────
  @Patch(':id/reject')
  rejectUser(@Param('id') id: string, @Body() dto: RejectUserDto) {
    return this.adminUsersService.rejectUser(id, dto.reason);
  }

  // ─────────────────────────────────────────────────────
  // PATCH /admin/users/:id/block
  // ─────────────────────────────────────────────────────
  @Patch(':id/block')
  blockUser(@Param('id') id: string, @Body() dto: RejectUserDto) {
    return this.adminUsersService.blockUser(id, dto.reason);
  }

  // ─────────────────────────────────────────────────────
  // DELETE /admin/users/:id
  // ─────────────────────────────────────────────────────
  @Delete(':id')
  deleteUser(@Param('id') id: string) {
    return this.adminUsersService.deleteUser(id);
  }
}