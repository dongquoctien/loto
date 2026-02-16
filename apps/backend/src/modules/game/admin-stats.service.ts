import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { GameSessionEntity } from './entities/game-session.entity';
import { GameResultEntity } from './entities/game-result.entity';
import { PurchasedSheetEntity } from './entities/purchased-sheet.entity';
import { RoomEntity } from '../room/entities/room.entity';
import { UserEntity } from '../user/user.entity';

export interface OverallStats {
  year: number;
  totalGames: number;
  totalRooms: number;
  totalPlayers: number;
  totalRevenue: number; // Tổng doanh thu (tiền đã chơi)
  totalSheetsPurchased: number;
  monthlyStats: MonthlyStats[];
}

export interface MonthlyStats {
  month: number;
  games: number;
  revenue: number;
  players: number;
}

export interface PlayerStats {
  userId: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  gamesPlayed: number;
  gamesWon: number;
  sheetsPurchased: number;
  totalWinnings: number; // Tiền thắng
  totalLosses: number; // Tiền thua
  netProfit: number; // Lãi/lỗ ròng
}

export interface RoomStats {
  roomId: number;
  roomCode: string;
  roomName: string;
  ownerName: string;
  pricePerSheet: number;
  totalGames: number;
  totalSheets: number;
  totalRevenue: number; // Tổng tiền đã chơi trong room
  status: string;
  createdAt: Date;
}

export interface StatsFilter {
  year?: number;
  month?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AdminStatsService {
  constructor(
    @InjectRepository(GameSessionEntity)
    private sessionRepo: Repository<GameSessionEntity>,
    @InjectRepository(GameResultEntity)
    private resultRepo: Repository<GameResultEntity>,
    @InjectRepository(PurchasedSheetEntity)
    private purchasedSheetRepo: Repository<PurchasedSheetEntity>,
    @InjectRepository(RoomEntity)
    private roomRepo: Repository<RoomEntity>,
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,
  ) {}

  /**
   * Get overall statistics for a year
   */
  async getOverallStats(year?: number): Promise<OverallStats> {
    const targetYear = year || new Date().getFullYear();
    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31, 23, 59, 59);

    // Total finished games in year
    const totalGames = await this.sessionRepo.count({
      where: {
        status: 'finished',
        createdAt: Between(startDate, endDate),
      },
    });

    // Total rooms created in year
    const totalRooms = await this.roomRepo.count({
      where: {
        createdAt: Between(startDate, endDate),
      },
    });

    // Unique players who played in year
    const playersResult = await this.purchasedSheetRepo
      .createQueryBuilder('ps')
      .innerJoin('ps.gameSession', 'gs')
      .where('gs.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .select('COUNT(DISTINCT ps.userId)', 'count')
      .getRawOne();
    const totalPlayers = parseInt(playersResult?.count || '0', 10);

    // Total sheets purchased and revenue
    const revenueResult = await this.purchasedSheetRepo
      .createQueryBuilder('ps')
      .innerJoin('ps.gameSession', 'gs')
      .innerJoin('gs.room', 'r')
      .where('gs.status = :status', { status: 'finished' })
      .andWhere('gs.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .select('COUNT(ps.id)', 'totalSheets')
      .addSelect('SUM(r.pricePerSheet)', 'totalRevenue')
      .getRawOne();

    const totalSheetsPurchased = parseInt(revenueResult?.totalSheets || '0', 10);
    const totalRevenue = parseInt(revenueResult?.totalRevenue || '0', 10);

    // Monthly breakdown
    const monthlyStats: MonthlyStats[] = [];
    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(targetYear, month, 1);
      const monthEnd = new Date(targetYear, month + 1, 0, 23, 59, 59);

      const monthGames = await this.sessionRepo.count({
        where: {
          status: 'finished',
          createdAt: Between(monthStart, monthEnd),
        },
      });

      const monthRevenueResult = await this.purchasedSheetRepo
        .createQueryBuilder('ps')
        .innerJoin('ps.gameSession', 'gs')
        .innerJoin('gs.room', 'r')
        .where('gs.status = :status', { status: 'finished' })
        .andWhere('gs.createdAt BETWEEN :start AND :end', { start: monthStart, end: monthEnd })
        .select('SUM(r.pricePerSheet)', 'revenue')
        .getRawOne();

      const monthPlayersResult = await this.purchasedSheetRepo
        .createQueryBuilder('ps')
        .innerJoin('ps.gameSession', 'gs')
        .where('gs.createdAt BETWEEN :start AND :end', { start: monthStart, end: monthEnd })
        .select('COUNT(DISTINCT ps.userId)', 'count')
        .getRawOne();

      monthlyStats.push({
        month: month + 1,
        games: monthGames,
        revenue: parseInt(monthRevenueResult?.revenue || '0', 10),
        players: parseInt(monthPlayersResult?.count || '0', 10),
      });
    }

    return {
      year: targetYear,
      totalGames,
      totalRooms,
      totalPlayers,
      totalRevenue,
      totalSheetsPurchased,
      monthlyStats,
    };
  }

  /**
   * Get statistics by player
   */
  async getStatsByPlayer(filter: StatsFilter = {}): Promise<{ data: PlayerStats[]; total: number }> {
    const { year, startDate, endDate, limit = 50, offset = 0 } = filter;

    let filterStartDate: Date | undefined;
    let filterEndDate: Date | undefined;

    if (year) {
      filterStartDate = new Date(year, 0, 1);
      filterEndDate = new Date(year, 11, 31, 23, 59, 59);
    } else if (startDate && endDate) {
      filterStartDate = startDate;
      filterEndDate = endDate;
    }

    // Build query using QueryBuilder for better type safety
    const qb = this.userRepo
      .createQueryBuilder('u')
      .innerJoin('purchased_sheets', 'ps', 'ps.user_id = u.id')
      .innerJoin('game_sessions', 'gs', 'ps.session_id = gs.id')
      .where('gs.status = :status', { status: 'finished' })
      .select([
        'u.id as userId',
        'u.username as username',
        'u.displayName as displayName',
        'u.avatarUrl as avatarUrl',
        'COUNT(DISTINCT ps.session_id) as gamesPlayed',
        'COUNT(ps.id) as sheetsPurchased',
      ])
      .groupBy('u.id')
      .orderBy('gamesPlayed', 'DESC')
      .limit(limit)
      .offset(offset);

    if (filterStartDate && filterEndDate) {
      qb.andWhere('gs.created_at BETWEEN :startDate AND :endDate', {
        startDate: filterStartDate,
        endDate: filterEndDate,
      });
    }

    const users = await qb.getRawMany();

    // Get total count
    const countQb = this.userRepo
      .createQueryBuilder('u')
      .innerJoin('purchased_sheets', 'ps', 'ps.user_id = u.id')
      .innerJoin('game_sessions', 'gs', 'ps.session_id = gs.id')
      .where('gs.status = :status', { status: 'finished' })
      .select('COUNT(DISTINCT u.id)', 'total');

    if (filterStartDate && filterEndDate) {
      countQb.andWhere('gs.created_at BETWEEN :startDate AND :endDate', {
        startDate: filterStartDate,
        endDate: filterEndDate,
      });
    }

    const countResult = await countQb.getRawOne();
    const total = parseInt(countResult?.total || '0', 10);

    // Calculate winnings, losses, and gamesWon for each player
    const playerStats: PlayerStats[] = [];

    for (const user of users) {
      const { totalWinnings, totalLosses, gamesWon } = await this.calculatePlayerProfitLoss(
        user.userId,
        filterStartDate,
        filterEndDate,
      );

      playerStats.push({
        userId: user.userId,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        gamesPlayed: parseInt(user.gamesPlayed, 10),
        gamesWon,
        sheetsPurchased: parseInt(user.sheetsPurchased, 10),
        totalWinnings,
        totalLosses,
        netProfit: totalWinnings - totalLosses,
      });
    }

    // Sort by net profit descending
    playerStats.sort((a, b) => b.netProfit - a.netProfit);

    return { data: playerStats, total };
  }

  /**
   * Calculate player's total winnings and losses
   */
  private async calculatePlayerProfitLoss(
    userId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ totalWinnings: number; totalLosses: number; gamesWon: number }> {
    // Count games won
    const gamesWonQb = this.resultRepo
      .createQueryBuilder('gr')
      .innerJoin('game_sessions', 'gs', 'gr.session_id = gs.id')
      .where('gr.winner_id = :userId', { userId })
      .andWhere('gs.status = :status', { status: 'finished' });

    if (startDate && endDate) {
      gamesWonQb.andWhere('gs.created_at BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    const gamesWon = await gamesWonQb.getCount();

    // Calculate winnings (when user won)
    const winningsQb = this.resultRepo
      .createQueryBuilder('gr')
      .innerJoin('game_sessions', 'gs', 'gr.session_id = gs.id')
      .innerJoin('rooms', 'r', 'gs.room_id = r.id')
      .where('gr.winner_id = :userId', { userId })
      .andWhere('gs.status = :status', { status: 'finished' })
      .select(
        `COALESCE(SUM(
          (SELECT COUNT(*) FROM purchased_sheets ps2
           WHERE ps2.session_id = gr.session_id AND ps2.user_id != gr.winner_id) * r.price_per_sheet
        ), 0)`,
        'totalWinnings',
      );

    if (startDate && endDate) {
      winningsQb.andWhere('gs.created_at BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    const winningsResult = await winningsQb.getRawOne();
    const totalWinnings = parseInt(winningsResult?.totalWinnings || '0', 10);

    // Calculate losses (when user lost)
    const lossesQb = this.sessionRepo
      .createQueryBuilder('gs')
      .innerJoin('rooms', 'r', 'gs.room_id = r.id')
      .innerJoin('game_results', 'gr', 'gr.session_id = gs.id')
      .where('gs.status = :status', { status: 'finished' })
      .andWhere('gr.winner_id != :userId', { userId })
      .andWhere(
        `EXISTS (SELECT 1 FROM purchased_sheets ps3 WHERE ps3.session_id = gs.id AND ps3.user_id = :userId)`,
        { userId },
      )
      .select(
        `COALESCE(SUM(
          (SELECT COUNT(*) FROM purchased_sheets ps2 WHERE ps2.session_id = gs.id AND ps2.user_id = :userId) * r.price_per_sheet
        ), 0)`,
        'totalLosses',
      );

    if (startDate && endDate) {
      lossesQb.andWhere('gs.created_at BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    const lossesResult = await lossesQb.getRawOne();
    const totalLosses = parseInt(lossesResult?.totalLosses || '0', 10);

    return { totalWinnings, totalLosses, gamesWon };
  }

  /**
   * Get statistics by room
   */
  async getStatsByRoom(filter: StatsFilter = {}): Promise<{ data: RoomStats[]; total: number }> {
    const { year, startDate, endDate, limit = 50, offset = 0 } = filter;

    let filterStartDate: Date | undefined;
    let filterEndDate: Date | undefined;

    if (year) {
      filterStartDate = new Date(year, 0, 1);
      filterEndDate = new Date(year, 11, 31, 23, 59, 59);
    } else if (startDate && endDate) {
      filterStartDate = startDate;
      filterEndDate = endDate;
    }

    const qb = this.roomRepo
      .createQueryBuilder('r')
      .leftJoin('users', 'u', 'r.owner_id = u.id')
      .select([
        'r.id as roomId',
        'r.room_code as roomCode',
        'r.name as roomName',
        'COALESCE(u.display_name, u.username) as ownerName',
        'r.price_per_sheet as pricePerSheet',
        'r.status as status',
        'r.created_at as createdAt',
      ])
      .addSelect(
        `(SELECT COUNT(*) FROM game_sessions gs WHERE gs.room_id = r.id AND gs.status = 'finished')`,
        'totalGames',
      )
      .addSelect(
        `(SELECT COUNT(*) FROM purchased_sheets ps
          INNER JOIN game_sessions gs ON ps.session_id = gs.id
          WHERE gs.room_id = r.id AND gs.status = 'finished')`,
        'totalSheets',
      )
      .addSelect(
        `(SELECT COALESCE(COUNT(*) * r.price_per_sheet, 0) FROM purchased_sheets ps
          INNER JOIN game_sessions gs ON ps.session_id = gs.id
          WHERE gs.room_id = r.id AND gs.status = 'finished')`,
        'totalRevenue',
      )
      .orderBy(
        `(SELECT COALESCE(COUNT(*) * r.price_per_sheet, 0) FROM purchased_sheets ps
          INNER JOIN game_sessions gs ON ps.session_id = gs.id
          WHERE gs.room_id = r.id AND gs.status = 'finished')`,
        'DESC',
      )
      .limit(limit)
      .offset(offset);

    if (filterStartDate && filterEndDate) {
      qb.where('r.created_at BETWEEN :startDate AND :endDate', {
        startDate: filterStartDate,
        endDate: filterEndDate,
      });
    }

    const rooms = await qb.getRawMany();

    // Get total count
    const countQb = this.roomRepo.createQueryBuilder('r').select('COUNT(*)', 'total');

    if (filterStartDate && filterEndDate) {
      countQb.where('r.created_at BETWEEN :startDate AND :endDate', {
        startDate: filterStartDate,
        endDate: filterEndDate,
      });
    }

    const countResult = await countQb.getRawOne();
    const total = parseInt(countResult?.total || '0', 10);

    const roomStats: RoomStats[] = rooms.map((room) => ({
      roomId: room.roomId,
      roomCode: room.roomCode,
      roomName: room.roomName,
      ownerName: room.ownerName,
      pricePerSheet: room.pricePerSheet,
      totalGames: parseInt(room.totalGames || '0', 10),
      totalSheets: parseInt(room.totalSheets || '0', 10),
      totalRevenue: parseInt(room.totalRevenue || '0', 10),
      status: room.status,
      createdAt: room.createdAt,
    }));

    return { data: roomStats, total };
  }

  /**
   * Get available years for filtering
   */
  async getAvailableYears(): Promise<number[]> {
    const result = await this.sessionRepo
      .createQueryBuilder('gs')
      .select('DISTINCT YEAR(gs.createdAt)', 'year')
      .orderBy('year', 'DESC')
      .getRawMany();

    return result.map((r) => r.year).filter(Boolean);
  }

  /**
   * Get top players by net profit
   */
  async getTopPlayers(limit = 10, year?: number): Promise<PlayerStats[]> {
    const { data } = await this.getStatsByPlayer({ year, limit });
    return data;
  }

  /**
   * Get top rooms by revenue
   */
  async getTopRooms(limit = 10, year?: number): Promise<RoomStats[]> {
    const { data } = await this.getStatsByRoom({ year, limit });
    return data;
  }
}
