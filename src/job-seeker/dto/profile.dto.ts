import {
  IsArray, IsBoolean, IsNotEmpty,
  IsOptional, IsString, MinLength
} from 'class-validator';

export class UpdateProfileDto {
  @IsString() @IsOptional()
  fullName?: string;

  @IsString() @IsOptional()
  phone?: string;

  @IsString() @IsOptional()
  location?: string;

  @IsString() @IsOptional()
  about?: string;

  @IsString() @IsOptional()
  experienceLevel?: string;

  @IsOptional()
  skills?: string[];

  @IsOptional()
  education?: {
    degreeName: string;
    institution: string;
    startDate: string;
    completionYear?: string;
    isCurrent?: boolean;
  }[];

  @IsOptional()
  experience?: {
    designation: string;
    companyName: string;
    startDate: string;
    endDate?: string;
    isCurrent?: boolean;
    description?: string;
  }[];
}

export class ChangePasswordDto {
  @IsString() @IsNotEmpty()
  currentPassword: string;

  @IsString() @MinLength(6)
  newPassword: string;

  @IsString() @IsNotEmpty()
  confirmPassword: string;
}