import { CreateRoomDto } from './create-room.dto';
import { IsOptional, IsString, IsEnum, IsNumber, IsBoolean, Min, Max } from 'class-validator';

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(['auto', 'manual'])
  callMode?: 'auto' | 'manual';

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(30)
  autoCallInterval?: number;

  @IsOptional()
  @IsNumber()
  @Min(1000)
  pricePerSheet?: number;

  @IsOptional()
  @IsNumber()
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
}
