import { IsString, IsOptional, MaxLength } from 'class-validator';

export class JoinRoomDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  password?: string;
}
