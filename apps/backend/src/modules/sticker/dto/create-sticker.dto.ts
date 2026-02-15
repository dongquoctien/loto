import { IsString, IsBoolean, IsNumber, IsOptional, MaxLength, IsUrl } from 'class-validator';

export class CreateStickerDto {
  @IsString()
  @MaxLength(50)
  stickerId: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsUrl()
  @MaxLength(500)
  url: string;

  @IsNumber()
  categoryId: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}
