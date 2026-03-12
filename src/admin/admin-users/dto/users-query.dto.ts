// dto/users-query.dto.ts
import { Type } from 'class-transformer';
import { IsOptional, IsIn, IsString, IsNumber } from 'class-validator';

export class UsersQueryDto {
    @IsOptional()
    @IsIn(['JOB_SEEKER', 'EMPLOYER', 'COMPANY'])
    role?: string;

    @IsOptional()
    @IsIn(['PENDING', 'ACTIVE', 'BLOCKED', 'REJECTED'])
    status?: string;

    @IsOptional()
    @IsString()
    search?: string;

    @Type(() => Number)
    @IsNumber()
    page?: number = 1;

    @Type(() => Number)
    @IsNumber()
    limit?: number = 10;
}