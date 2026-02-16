import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

// Room status enum
export type RoomStatus = 'waiting' | 'playing' | 'closed';

/**
 * DTO for filtering rooms in admin list
 */
export class AdminRoomFilterDto {
  @IsOptional()
  @IsString()
  search?: string; // Search by room name or code

  @IsOptional()
  @IsEnum(['waiting', 'playing', 'closed'])
  status?: RoomStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ownerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * DTO for admin updating room settings (no ownership check)
 */
export class AdminUpdateRoomDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(['auto', 'manual'])
  callMode?: 'auto' | 'manual';

  @IsOptional()
  @IsString()
  callVoice?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  autoCallInterval?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  pricePerSheet?: number;

  @IsOptional()
  @Type(() => Number)
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

  @IsOptional()
  @IsString()
  backgroundMusicUrl?: string;

  @IsOptional()
  @IsEnum(['waiting', 'playing', 'closed'])
  status?: RoomStatus;
}

/**
 * DTO for closing a room
 */
export class CloseRoomDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * DTO for removing a player from room
 */
export class RemovePlayerDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * Response interface for admin room list
 */
export interface AdminRoomResponse {
  id: number;
  roomCode: string;
  name: string;
  ownerId: number;
  ownerName: string;
  status: RoomStatus;
  playerCount: number;
  maxPlayers: number;
  hasPassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Response interface for paginated room list
 */
export interface AdminRoomsListResponse {
  rooms: AdminRoomResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
