import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSubscriptionPlanDto } from './dto/subcription.dto';

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return { success: true, data: plans };
  }

  async createPlan(dto: CreateSubscriptionPlanDto) {
    const plan = await this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name,
        price: dto.price,
        duration: dto.duration,
        slotsAvailable: dto.slotsAvailable,
        features: dto.features,
      },
    });
    return { success: true, message: 'Plan created successfully', data: plan };
  }

  async updatePlan(id: string, dto: CreateSubscriptionPlanDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');

    const updated = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        name: dto.name,
        price: dto.price,
        duration: dto.duration,
        slotsAvailable: dto.slotsAvailable,
        features: dto.features,
      },
    });
    return { success: true, message: 'Plan updated successfully', data: updated };
  }

  async deletePlan(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');

    await this.prisma.subscriptionPlan.delete({ where: { id } });
    return { success: true, message: 'Plan deleted successfully' };
  }
}