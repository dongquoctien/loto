import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UserEntity } from './user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminCreateUserDto, AdminUpdateUserDto } from './dto/admin-user.dto';

export interface PublicPlayerProfile {
  id: number;
  displayName: string;
  avatarUrl: string | null;
  qrCodeUrl: string | null;
  winCount: number;
  gamesPlayed: number;
  winRate: number;
  totalRevenue: number; // Tổng tiền thắng được (doanh thu)
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findById(id: number): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(userId: number, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findById(userId);

    if (dto.displayName !== undefined) user.displayName = dto.displayName;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;
    if (dto.qrCodeUrl !== undefined) user.qrCodeUrl = dto.qrCodeUrl;

    return this.userRepository.save(user);
  }

  async incrementWinCount(userId: number): Promise<void> {
    await this.userRepository.increment({ id: userId }, 'winCount', 1);
  }

  sanitize(user: UserEntity) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      qrCodeUrl: user.qrCodeUrl,
      winCount: user.winCount ?? 0,
      role: user.role,
    };
  }

  /**
   * Get public player profile with game statistics
   */
  async getPublicProfile(userId: number): Promise<PublicPlayerProfile> {
    const user = await this.findById(userId);

    // Count total games played (sessions where user purchased sheets AND game finished)
    const gamesPlayedResult = await this.dataSource.query(
      `SELECT COUNT(DISTINCT ps.session_id) as gamesPlayed
       FROM purchased_sheets ps
       INNER JOIN game_sessions gs ON ps.session_id = gs.id
       WHERE ps.user_id = ? AND gs.status = 'finished'`,
      [userId],
    );
    const gamesPlayed = parseInt(gamesPlayedResult[0]?.gamesPlayed || '0', 10);

    // Count actual wins from game_results (more accurate than users.win_count)
    const winCountResult = await this.dataSource.query(
      `SELECT COUNT(*) as winCount
       FROM game_results gr
       INNER JOIN game_sessions gs ON gr.session_id = gs.id
       WHERE gr.winner_id = ? AND gs.status = 'finished'`,
      [userId],
    );
    const winCount = parseInt(winCountResult[0]?.winCount || '0', 10);

    // Calculate total revenue (tiền thắng được từ các trận)
    // Revenue = tổng tiền những người thua trả khi user thắng
    const revenueResult = await this.dataSource.query(
      `SELECT COALESCE(SUM(
        (SELECT COUNT(*) FROM purchased_sheets ps2
         WHERE ps2.session_id = gr.session_id AND ps2.user_id != gr.winner_id) * r.price_per_sheet
      ), 0) as totalRevenue
       FROM game_results gr
       INNER JOIN game_sessions gs ON gr.session_id = gs.id
       INNER JOIN rooms r ON gs.room_id = r.id
       WHERE gr.winner_id = ? AND gs.status = 'finished'`,
      [userId],
    );
    const totalRevenue = parseInt(revenueResult[0]?.totalRevenue || '0', 10);

    const winRate = gamesPlayed > 0 ? Math.round((winCount / gamesPlayed) * 100 * 10) / 10 : 0;

    return {
      id: user.id,
      displayName: user.displayName || user.username,
      avatarUrl: user.avatarUrl,
      qrCodeUrl: user.qrCodeUrl,
      winCount,
      gamesPlayed,
      winRate,
      totalRevenue,
    };
  }

  // ============ ADMIN METHODS ============

  /**
   * Get all users with pagination
   */
  async getAllUsers(page = 1, limit = 20): Promise<{ users: UserEntity[]; total: number }> {
    const [users, total] = await this.userRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { users, total };
  }

  /**
   * Get user by ID (admin view - includes all fields)
   */
  async getAdminUserById(id: number): Promise<UserEntity> {
    return this.findById(id);
  }

  /**
   * Create a new user (admin)
   */
  async adminCreateUser(dto: AdminCreateUserDto): Promise<UserEntity> {
    // Check if username already exists
    const existingUsername = await this.userRepository.findOne({ where: { username: dto.username } });
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    // Check if email already exists
    const existingEmail = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.userRepository.create({
      username: dto.username,
      email: dto.email,
      passwordHash,
      displayName: dto.displayName || dto.username,
      role: dto.role || 'user',
      isBanned: false,
    });

    return this.userRepository.save(user);
  }

  /**
   * Update a user (admin)
   */
  async adminUpdateUser(id: number, dto: AdminUpdateUserDto): Promise<UserEntity> {
    const user = await this.findById(id);

    // Check if new username conflicts
    if (dto.username && dto.username !== user.username) {
      const existing = await this.userRepository.findOne({ where: { username: dto.username } });
      if (existing) {
        throw new ConflictException('Username already exists');
      }
    }

    // Check if new email conflicts
    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepository.findOne({ where: { email: dto.email } });
      if (existing) {
        throw new ConflictException('Email already exists');
      }
    }

    if (dto.username !== undefined) user.username = dto.username;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.displayName !== undefined) user.displayName = dto.displayName;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;
    if (dto.qrCodeUrl !== undefined) user.qrCodeUrl = dto.qrCodeUrl;

    return this.userRepository.save(user);
  }

  /**
   * Change user role (admin)
   */
  async changeRole(id: number, role: 'user' | 'admin'): Promise<UserEntity> {
    const user = await this.findById(id);
    user.role = role;
    return this.userRepository.save(user);
  }

  /**
   * Reset user password (admin)
   */
  async resetPassword(id: number, newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    const user = await this.findById(id);
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);
  }

  /**
   * Ban or unban a user (admin)
   */
  async setBanStatus(id: number, banned: boolean): Promise<UserEntity> {
    const user = await this.findById(id);
    user.isBanned = banned;
    user.bannedAt = banned ? new Date() : null;
    return this.userRepository.save(user);
  }

  /**
   * Delete a user (admin)
   */
  async deleteUser(id: number): Promise<void> {
    const user = await this.findById(id);
    await this.userRepository.remove(user);
  }

  /**
   * Sanitize user for admin view (includes all fields except password)
   */
  sanitizeForAdmin(user: UserEntity) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      qrCodeUrl: user.qrCodeUrl,
      winCount: user.winCount ?? 0,
      role: user.role,
      isBanned: user.isBanned,
      bannedAt: user.bannedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
