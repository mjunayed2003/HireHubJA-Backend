import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString, IsBoolean, IsInt, Min  } from 'class-validator';
import { JobType, JobStatus, ApplicationStatus } from '../../generated/prisma/client';


// 1. Post Job DTO
export class CreateJobDto {
  // ── Step 1: Job Basics ──────────────────────────────
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  numberOfEmployees?: number;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsArray()
  @IsEnum(JobType, { each: true })
  jobType: JobType[]; // ["FULL_TIME", "PART_TIME"]

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsBoolean()
  @IsOptional()
  isRemote?: boolean;

  @IsDateString()
  @IsOptional()
  deadline?: string;

  // ── Step 2: Job Details ──────────────────────────────
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  responsibilities?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  benefits?: string[];

  // ── Step 3: Skills & Candidate Criteria ─────────────
  @IsString()
  @IsOptional()
  experienceLevel?: string; // "Entry" | "Mid" | "Senior"

  @IsInt()
  @Min(0)
  @IsOptional()
  minExperience?: number;

  @IsString()
  @IsOptional()
  educationLevel?: string;

  // ── Step 4: Salary & Payment ─────────────────────────
  @IsString()
  @IsOptional()
  salaryType?: string; // "FIXED" | "RANGE" | "NEGOTIABLE"

  @IsString()
  @IsOptional()
  salaryFrequency?: string; // "MONTHLY" | "WEEKLY" | "CONTRACT"

  @IsString()
  @IsOptional()
  salaryAmount?: string; // "1000" or "1000-2000"

  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;
}

// 2. Schedule Interview DTO
export class ScheduleInterviewDto {
  @IsDateString()
  @IsNotEmpty()
  scheduleDate: string;

  @IsString()
  @IsOptional()
  scheduleTime?: string; // ✅ "11:00AM"

  @IsString()
  @IsOptional()
  interviewType?: string; // ✅ "Video (Zoom)"

  @IsString()
  @IsOptional()
  duration?: string; // ✅ "30 minutes"

  @IsString()
  @IsOptional()
  meetingLink?: string;

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