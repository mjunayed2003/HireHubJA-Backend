import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../admin-auth/guards/roles.guard';
import { Roles } from '../admin-auth/decorators/roles.decorator';
import { UserRole } from '../../generated/prisma/client';
import { DashboardQueryDto } from './dto/Dashboard-query.dto';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /admin/dashboard/stats
   */
  @Get('stats')
  getStats() {
    return this.dashboardService.getStats();
  }

  /**
   * GET /admin/dashboard/pie-chart
   */
  @Get('pie-chart')
  getPieChart() {
    return this.dashboardService.getPieChart();
  }

  /**
    * GET /admin/dashboard/earnings?period=MONTHLY
   */
  @Get('earnings')
  getEarnings(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getEarnings(query.period);
  }

  /**
   * GET /admin/dashboard/approval-requests?type=JOB_SEEKER&limit=10
   */
  @Get('approval-requests')
  getApprovalRequests(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getApprovalRequests(query.type, query.limit);
  }

  /**
   * GET /admin/dashboard/interviews?limit=10
   */
  @Get('interviews')
  getRecentInterviews(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getRecentInterviews(query.limit);
  }
}