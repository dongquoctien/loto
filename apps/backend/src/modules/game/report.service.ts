import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameSessionEntity } from './entities/game-session.entity';
import { GameResultEntity } from './entities/game-result.entity';
import { PurchasedSheetEntity } from './entities/purchased-sheet.entity';
import { RoomService } from '../room/room.service';
import { UserEntity } from '../user/user.entity';
import {
  PersonalReport,
  RoomReport,
  PlayerDebt,
  RoomReportPlayer,
} from '@loto/shared';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(GameSessionEntity)
    private sessionRepo: Repository<GameSessionEntity>,
    @InjectRepository(GameResultEntity)
    private resultRepo: Repository<GameResultEntity>,
    @InjectRepository(PurchasedSheetEntity)
    private purchasedSheetRepo: Repository<PurchasedSheetEntity>,
    @Inject(forwardRef(() => RoomService))
    private roomService: RoomService,
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,
  ) {}

  async getPersonalReport(
    userId: number,
    roomId: number,
  ): Promise<PersonalReport> {
    // Get room for price per sheet
    const room = await this.roomService.findById(roomId);
    const pricePerSheet = room?.pricePerSheet || 10000;

    // Get all finished sessions in this room
    const sessions = await this.sessionRepo.find({
      where: { roomId, status: 'finished' },
      relations: ['gameResults', 'purchasedSheets'],
    });

    const owedToMeMap = new Map<number, PlayerDebt>();
    const iOweMap = new Map<number, PlayerDebt>();
    let totalProfit = 0;
    let wins = 0;
    let losses = 0;

    for (const session of sessions) {
      const result = session.gameResults[0];
      if (!result) continue;

      const mySheets = session.purchasedSheets.filter(
        (s) => s.userId === userId,
      );
      const winnerId = result.winnerId;

      if (winnerId === userId) {
        // I won - others owe me
        wins++;
        for (const sheet of session.purchasedSheets) {
          if (sheet.userId !== userId) {
            const loserId = sheet.userId;
            const existing = owedToMeMap.get(loserId);
            if (existing) {
              existing.amount += pricePerSheet;
              existing.gameCount += 1;
            } else {
              owedToMeMap.set(loserId, {
                userId: loserId,
                displayName: '', // Will be filled later
                avatarUrl: null,
                amount: pricePerSheet,
                gameCount: 1,
              });
            }
            totalProfit += pricePerSheet;
          }
        }
      } else if (mySheets.length > 0) {
        // I lost - I owe the winner
        losses++;
        const amount = mySheets.length * pricePerSheet;
        totalProfit -= amount;

        const existing = iOweMap.get(winnerId);
        if (existing) {
          existing.amount += amount;
          existing.gameCount += 1;
        } else {
          iOweMap.set(winnerId, {
            userId: winnerId,
            displayName: '',
            avatarUrl: null,
            amount,
            gameCount: 1,
          });
        }
      }
    }

    // Fetch user details for all debtors/creditors
    const allUserIds = [
      ...new Set([...owedToMeMap.keys(), ...iOweMap.keys()]),
    ];
    if (allUserIds.length > 0) {
      const users = await this.userRepo.findByIds(allUserIds);
      const userMap = new Map(users.map((u) => [u.id, u]));

      for (const [uid, debt] of owedToMeMap) {
        const user = userMap.get(uid);
        if (user) {
          debt.displayName = user.displayName || user.username;
          debt.avatarUrl = user.avatarUrl;
        }
      }
      for (const [uid, debt] of iOweMap) {
        const user = userMap.get(uid);
        if (user) {
          debt.displayName = user.displayName || user.username;
          debt.avatarUrl = user.avatarUrl;
        }
      }
    }

    return {
      userId,
      totalProfit,
      totalWins: wins,
      totalLosses: losses,
      gamesPlayed: wins + losses,
      owedToMe: Array.from(owedToMeMap.values()).sort(
        (a, b) => b.amount - a.amount,
      ),
      iOwe: Array.from(iOweMap.values()).sort((a, b) => b.amount - a.amount),
    };
  }

  async getRoomReport(roomId: number): Promise<RoomReport> {
    const room = await this.roomService.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const pricePerSheet = room.pricePerSheet || 10000;

    // Get all finished sessions
    const sessions = await this.sessionRepo.find({
      where: { roomId, status: 'finished' },
      relations: ['gameResults', 'purchasedSheets'],
    });

    // Aggregate stats per player
    const playerStats = new Map<
      number,
      {
        totalProfit: number;
        wins: number;
        losses: number;
        gamesPlayed: Set<number>;
      }
    >();

    for (const session of sessions) {
      const result = session.gameResults[0];
      if (!result) continue;

      const winnerId = result.winnerId;

      // Track all participants in this session
      const participants = new Set<number>();
      for (const sheet of session.purchasedSheets) {
        participants.add(sheet.userId);
      }

      for (const participantId of participants) {
        if (!playerStats.has(participantId)) {
          playerStats.set(participantId, {
            totalProfit: 0,
            wins: 0,
            losses: 0,
            gamesPlayed: new Set(),
          });
        }

        const stats = playerStats.get(participantId)!;
        stats.gamesPlayed.add(session.id);

        if (participantId === winnerId) {
          // Winner gains from all losers
          stats.wins++;
          const winnings = session.purchasedSheets.filter(
            (s) => s.userId !== winnerId,
          ).length;
          stats.totalProfit += winnings * pricePerSheet;
        } else {
          // Loser pays per sheet owned
          stats.losses++;
          const sheetsOwned = session.purchasedSheets.filter(
            (s) => s.userId === participantId,
          ).length;
          stats.totalProfit -= sheetsOwned * pricePerSheet;
        }
      }
    }

    // Fetch user details
    const userIds = Array.from(playerStats.keys());
    const users =
      userIds.length > 0 ? await this.userRepo.findByIds(userIds) : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const players: RoomReportPlayer[] = Array.from(playerStats.entries())
      .map(([uId, stats]) => {
        const user = userMap.get(uId);
        return {
          userId: uId,
          displayName: user?.displayName || user?.username || `User ${uId}`,
          avatarUrl: user?.avatarUrl || null,
          totalProfit: stats.totalProfit,
          wins: stats.wins,
          losses: stats.losses,
          gamesPlayed: stats.gamesPlayed.size,
        };
      })
      .sort((a, b) => b.totalProfit - a.totalProfit);

    return {
      roomCode: room.roomCode,
      roomName: room.name,
      totalGames: sessions.length,
      pricePerSheet,
      players,
    };
  }
}
