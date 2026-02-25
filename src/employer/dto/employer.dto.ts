import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';
import { JobType, JobStatus, ApplicationStatus } from '@prisma/client';

// 1. Post Job DTO
export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsArray()
  @IsEnum(JobType, { each: true })
  jobType: JobType[]; // ["FULL_TIME", "REMOTE"]

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsString()
  @IsOptional()
  salaryRange?: string; // e.g. "1000-2000"

  @IsString()
  @IsNotEmpty()
  description: string; // HTML or Text format
}

// 2. Schedule Interview DTO
export class ScheduleInterviewDto {
  @IsDateString()
  @IsNotEmpty()
  scheduleDate: string; // "2026-01-22T11:00:00Z"

  @IsString()
  @IsOptional()
  meetingLink?: string; // Zoom Link

  @IsString()
  @IsOptional()
  notes?: string;
}

// 3. Change Application Status DTO (Reject/Hire)
export class UpdateApplicationStatusDto {
  @IsEnum(ApplicationStatus)
  @IsNotEmpty()
  status: ApplicationStatus; // 'HIRED' or 'REJECTED'
}