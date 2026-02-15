import { IsString, IsBoolean, IsNumber, IsOptional, MaxLength } from 'class-validator';

export class UpdateCategoryDto {
  @IsString()
  @MaxLength(50)
  @IsOptional()
  slug?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsString()
  @MaxLength(10)
  @IsOptional()
  icon?: string;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
