import {
  Controller, Get, Post, Put, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/admin/admin-auth/guards/roles.guard';
import { Roles } from 'src/admin/admin-auth/decorators/roles.decorator';
import { UserRole } from 'src/generated/prisma/client';
import { CreateSubscriptionPlanDto } from './dto/subcription.dto';

@Controller('admin/subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  // GET /admin/subscriptions
  @Get()
  getPlans() {
    return this.subscriptionService.getPlans();
  }

  // POST /admin/subscriptions
  @Post()
  createPlan(@Body() dto: CreateSubscriptionPlanDto) {
    return this.subscriptionService.createPlan(dto);
  }

  // PUT /admin/subscriptions/:id
  @Put(':id')
  updatePlan(@Param('id') id: string, @Body() dto: CreateSubscriptionPlanDto) {
    return this.subscriptionService.updatePlan(id, dto);
  }

  // DELETE /admin/subscriptions/:id
  @Delete(':id')
  deletePlan(@Param('id') id: string) {
    return this.subscriptionService.deletePlan(id);
  }
}