import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsEnum(['auto', 'manual'])
  callMode?: 'auto' | 'manual';

  @IsOptional()
  @IsString()
  callVoice?: string;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(30)
  autoCallInterval?: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  pricePerSheet?: number;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(50)
  maxPlayers?: number;

  @IsOptional()
  @IsBoolean()
  winHorizontal?: boolean;

  @IsOptional()
  @IsBoolean()
  winVertical?: boolean;

  @IsOptional()
  @IsBoolean()
  winDiagonal?: boolean;

  @IsOptional()
  @IsBoolean()
  allowHandsFree?: boolean;
}
