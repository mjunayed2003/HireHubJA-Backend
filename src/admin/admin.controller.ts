import { 
  Body, 
  Controller, 
  Get, 
  Param, 
  Patch, 
  Query, 
  UseGuards 
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RejectUserDto } from './dto/admin.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // GET: /admin/approvals?page=1&limit=10
  @Get('approvals')
  async getPendingRequests(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.adminService.getPendingUsers(Number(page), Number(limit));
  }

  // GET: /admin/users/:id
  @Get('users/:id')
  async getUserDetails(@Param('id') id: string) {
    return this.adminService.getUserDetails(id);
  }

  // PATCH: /admin/users/:id/approve
  @Patch('users/:id/approve')
  async approveUser(@Param('id') id: string) {
    return this.adminService.approveUser(id);
  }

  // PATCH: /admin/users/:id/reject
  @Patch('users/:id/reject')
  async rejectUser(
    @Param('id') id: string, 
    @Body() dto: RejectUserDto
  ) {
    return this.adminService.rejectUser(id, dto);
  }
}