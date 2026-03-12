import { Module } from '@nestjs/common';
import { AdminReportsController } from './admin.reports.controller';
import { AdminReportsService } from './admin.reports.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminReportsController],
  providers: [AdminReportsService],
})
export class AdminReportsModule {}