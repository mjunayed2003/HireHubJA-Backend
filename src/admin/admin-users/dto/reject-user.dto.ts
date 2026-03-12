// dto/reject-user.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class RejectUserDto {
  @IsOptional()
  @IsString()
  reason?: string;
}