import { IsString, IsEmail, IsEnum, IsOptional, MinLength, MaxLength } from 'class-validator';

export class AdminCreateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @IsEmail()
  @MaxLength(100)
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  displayName?: string;

  @IsEnum(['user', 'admin'])
  @IsOptional()
  role?: 'user' | 'admin';
}

export class AdminUpdateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @IsOptional()
  username?: string;

  @IsEmail()
  @MaxLength(100)
  @IsOptional()
  email?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  displayName?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  avatarUrl?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  qrCodeUrl?: string;
}

export class ChangeRoleDto {
  @IsEnum(['user', 'admin'])
  role: 'user' | 'admin';
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;
}

export class BanUserDto {
  banned: boolean;
}
