import { IsString, IsOptional, IsNotEmpty, MinLength } from 'class-validator';

export class UpdateEmployerProfileDto {
  @IsString() @IsOptional()
  fullName?: string;

  @IsString() @IsOptional()
  companyName?: string;

  @IsString() @IsOptional()
  phone?: string;

  @IsString() @IsOptional()
  location?: string;

  @IsString() @IsOptional()
  about?: string;

  @IsString() @IsOptional()
  website?: string;

  @IsString() @IsOptional()
  businessRegCertId?: string;

  @IsString() @IsOptional()
  taxId?: string;

  @IsString() @IsOptional()
  authorizedRepId?: string;
}

export class ChangePasswordDto {
  @IsString() @IsNotEmpty()
  currentPassword: string;

  @IsString() @MinLength(6)
  newPassword: string;

  @IsString() @IsNotEmpty()
  confirmPassword: string;
}