import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AdminInterviewsService } from './admin.interviews.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from '../admin-auth/guards/roles.guard';
import { Roles } from '../admin-auth/decorators/roles.decorator';
import { UserRole } from 'src/generated/prisma/client';
import { AdminInterviewsQueryDto } from './dto/admin-interviews-query.dto';

@Controller('admin/interviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminInterviewsController {
  constructor(private readonly adminInterviewsService: AdminInterviewsService) {}

  // GET /admin/interviews
  @Get()
  getInterviews(@Query() query: AdminInterviewsQueryDto) {
    return this.adminInterviewsService.getInterviews(query);
  }

  // GET /admin/interviews/:id
  @Get(':id')
  getInterviewById(@Param('id') id: string) {
    return this.adminInterviewsService.getInterviewById(id);
  }
}