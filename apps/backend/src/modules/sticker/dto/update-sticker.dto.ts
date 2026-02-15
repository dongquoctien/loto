import { IsString, IsBoolean, IsNumber, IsOptional, MaxLength, IsUrl } from 'class-validator';

export class UpdateStickerDto {
  @IsString()
  @MaxLength(50)
  @IsOptional()
  stickerId?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsString()
  @IsUrl()
  @MaxLength(500)
  @IsOptional()
  url?: string;

  @IsNumber()
  @IsOptional()
  categoryId?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}
