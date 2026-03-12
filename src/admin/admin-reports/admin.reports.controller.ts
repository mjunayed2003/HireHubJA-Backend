import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminReportsService } from './admin.reports.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from '../admin-auth/guards/roles.guard';
import { Roles } from '../admin-auth/decorators/roles.decorator';
import { UserRole } from 'src/generated/prisma/client';
import { ReportsQueryDto } from './dto/report-query.dto';

@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminReportsController {
  constructor(private readonly adminReportsService: AdminReportsService) {}

  // ─────────────────────────────────────────────────────
  // GET /admin/reports?status=PENDING&page=1&limit=10
  // ─────────────────────────────────────────────────────
  @Get()
  getReports(@Query() query: ReportsQueryDto) {
    return this.adminReportsService.getReports(query);
  }

  // ─────────────────────────────────────────────────────
  // GET /admin/reports/:id
  // ─────────────────────────────────────────────────────
  @Get(':id')
  getReportById(@Param('id') id: string) {
    return this.adminReportsService.getReportById(id);
  }

  // ─────────────────────────────────────────────────────
  // PATCH /admin/reports/:id/resolve
  // ─────────────────────────────────────────────────────
  @Patch(':id/resolve')
  resolveReport(@Param('id') id: string) {
    return this.adminReportsService.resolveReport(id);
  }
}