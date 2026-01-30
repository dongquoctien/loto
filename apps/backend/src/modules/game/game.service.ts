import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { GameSessionEntity } from './entities/game-session.entity';
import { CalledNumberEntity } from './entities/called-number.entity';
import { PurchasedSheetEntity } from './entities/purchased-sheet.entity';
import { MarkedCellEntity } from './entities/marked-cell.entity';
import { GameResultEntity } from './entities/game-result.entity';
import { PenaltyEntity } from './entities/penalty.entity';
import { TicketService } from '../ticket/ticket.service';
import { RoomService } from '../room/room.service';
import { WinType, LineDetails, validateWinClaim, TicketData } from '@loto/shared';

interface InMemoryGameState {
  calledNumbers: number[];
  remainingNumbers: number[];
  autoCallTimer: ReturnType<typeof setTimeout> | null;
  status: 'preparing' | 'active' | 'paused' | 'paused_for_kinh' | 'finished';
  purchasedSheets: Map<number, number>; // sheetId -> userId
  penalizedPlayers: Set<number>;
  currentKinhClaim: {
    userId: number;
    ticketId: number;
    winType: WinType;
    lineDetails: LineDetails;
  } | null;
}

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);
  private gameStates = new Map<number, InMemoryGameState>();
  // Maps sessionId -> roomId for reverse lookups
  private sessionRoomMap = new Map<number, number>();

  constructor(
    @InjectRepository(GameSessionEntity)
    private readonly sessionRepository: Repository<GameSessionEntity>,
    @InjectRepository(CalledNumberEntity)
    private readonly calledNumberRepository: Repository<CalledNumberEntity>,
    @InjectRepository(PurchasedSheetEntity)
    private readonly purchasedSheetRepository: Repository<PurchasedSheetEntity>,
    @InjectRepository(MarkedCellEntity)
    private readonly markedCellRepository: Repository<MarkedCellEntity>,
    @InjectRepository(GameResultEntity)
    private readonly gameResultRepository: Repository<GameResultEntity>,
    @InjectRepository(PenaltyEntity)
    private readonly penaltyRepository: Repository<PenaltyEntity>,
    private readonly ticketService: TicketService,
    private readonly roomService: RoomService,
    private readonly dataSource: DataSource,
  ) {}

  async createSession(roomId: number): Promise<GameSessionEntity> {
    const lastSession = await this.sessionRepository.findOne({
      where: { roomId },
      order: { sessionNumber: 'DESC' },
    });

    const sessionNumber = lastSession ? lastSession.sessionNumber + 1 : 1;

    const session = this.sessionRepository.create({
      roomId,
      sessionNumber,
      status: 'preparing',
    });

    const savedSession = await this.sessionRepository.save(session);

    // Track session-room mapping
    this.sessionRoomMap.set(savedSession.id, roomId);

    // Initialize in-memory state
    this.gameStates.set(savedSession.id, {
      calledNumbers: [],
      remainingNumbers: this.generateShuffledNumbers(),
      autoCallTimer: null,
      status: 'preparing',
      purchasedSheets: new Map(),
      penalizedPlayers: new Set(),
      currentKinhClaim: null,
    });

    return savedSession;
  }

  async purchaseSheet(
    sessionId: number,
    userId: number,
    sheetId: number,
  ): Promise<void> {
    const state = this.getState(sessionId);

    if (state.status !== 'preparing') {
      throw new BadRequestException('Can only purchase sheets before game starts');
    }

    if (state.purchasedSheets.has(sheetId)) {
      throw new BadRequestException('Sheet already purchased');
    }

    // Atomic DB operation
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existing = await queryRunner.manager.findOne(PurchasedSheetEntity, {
        where: { sessionId, sheetId },
      });

      if (existing) {
        throw new BadRequestException('Sheet already purchased');
      }

      await queryRunner.manager.save(PurchasedSheetEntity, {
        sessionId,
        userId,
        sheetId,
      });

      await queryRunner.commitTransaction();
      state.purchasedSheets.set(sheetId, userId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async startGame(sessionId: number): Promise<void> {
    const state = this.getState(sessionId);
    state.status = 'active';
    await this.sessionRepository.update(sessionId, { status: 'active' });
  }

  async pauseGame(sessionId: number): Promise<void> {
    const state = this.getState(sessionId);

    if (state.status !== 'active') {
      throw new BadRequestException('Can only pause an active game');
    }

    state.status = 'paused';
    await this.sessionRepository.update(sessionId, { status: 'paused' });
  }

  async resumeGame(sessionId: number): Promise<void> {
    const state = this.getState(sessionId);

    if (state.status !== 'paused') {
      throw new BadRequestException('Can only resume a paused game');
    }

    state.status = 'active';
    await this.sessionRepository.update(sessionId, { status: 'active' });
  }

  async resetGame(roomId: number): Promise<GameSessionEntity> {
    // Clean up any existing active session for this room
    const existing = this.findSessionForRoom(roomId);
    if (existing) {
      this.cleanupSession(existing.sessionId);
    }

    // Create a fresh session
    return this.createSession(roomId);
  }

  callNextNumber(sessionId: number): number | null {
    const state = this.getState(sessionId);

    if (state.status !== 'active') return null;
    if (state.remainingNumbers.length === 0) return null;

    const number = state.remainingNumbers.pop()!;
    state.calledNumbers.push(number);

    // Async persist (don't await)
    this.calledNumberRepository.save({
      sessionId,
      numberValue: number,
      callOrder: state.calledNumbers.length,
    }).catch((err) => this.logger.error(`Failed to persist called number ${number} for session ${sessionId}`, err.stack));

    return number;
  }

  async handleKinhClaim(
    sessionId: number,
    userId: number,
    ticketId: number,
    winType: WinType,
    lineDetails: LineDetails,
  ): Promise<{ preValidated: boolean }> {
    const state = this.getState(sessionId);

    if (state.status !== 'active') {
      throw new BadRequestException('Game is not active');
    }

    if (state.penalizedPlayers.has(userId)) {
      throw new ForbiddenException('You have been penalized and cannot claim');
    }

    // Server-side pre-validation: check if the claim could be valid
    let preValidated = false;
    try {
      const ticket = await this.ticketService.getTicketById(ticketId);
      if (ticket) {
        const ticketData: TicketData = {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          colorGroup: ticket.colorGroup as TicketData['colorGroup'],
          rows: [ticket.row1, ticket.row2, ticket.row3] as TicketData['rows'],
        };
        const calledSet = new Set(state.calledNumbers);
        const validation = validateWinClaim(ticketData, calledSet, winType, lineDetails);
        preValidated = validation.valid;

        if (!validation.valid) {
          this.logger.warn(
            `Kinh claim pre-validation failed for user ${userId}, ticket ${ticketId}: ${validation.reason}`,
          );
        }
      }
    } catch (err) {
      this.logger.error('Error during kinh pre-validation', err);
    }

    // Still pause the game regardless - owner makes final decision
    state.status = 'paused_for_kinh';
    state.currentKinhClaim = { userId, ticketId, winType, lineDetails };

    await this.sessionRepository.update(sessionId, { status: 'paused_for_kinh' });

    return { preValidated };
  }

  async approveKinh(sessionId: number): Promise<GameResultEntity> {
    const state = this.getState(sessionId);
    const claim = state.currentKinhClaim;

    if (!claim) {
      throw new BadRequestException('No pending kinh claim');
    }

    state.status = 'finished';
    state.currentKinhClaim = null;

    if (state.autoCallTimer) {
      clearInterval(state.autoCallTimer);
      state.autoCallTimer = null;
    }

    // Save result
    const result = await this.gameResultRepository.save({
      sessionId,
      winnerId: claim.userId,
      winType: claim.winType,
      winningTicketId: claim.ticketId,
      lineDetails: claim.lineDetails as unknown as Record<string, unknown>,
    });

    await this.sessionRepository.update(sessionId, { status: 'finished' });

    return result;
  }

  async rejectKinh(sessionId: number): Promise<void> {
    const state = this.getState(sessionId);
    const claim = state.currentKinhClaim;

    if (!claim) {
      throw new BadRequestException('No pending kinh claim');
    }

    // Penalize the player
    state.penalizedPlayers.add(claim.userId);
    state.status = 'active';
    state.currentKinhClaim = null;

    await this.penaltyRepository.save({
      sessionId,
      userId: claim.userId,
      reason: 'wrong_kinh',
      mustPay: true,
    });

    await this.sessionRepository.update(sessionId, { status: 'active' });
  }

  calculatePayments(
    sessionId: number,
    pricePerSheet: number,
    winnerId: number,
  ): { userId: number; amount: number }[] {
    const state = this.getState(sessionId);
    const payments: { userId: number; amount: number }[] = [];
    const userSheetCounts = new Map<number, number>();

    // Count sheets per user
    for (const [, userId] of state.purchasedSheets) {
      userSheetCounts.set(userId, (userSheetCounts.get(userId) || 0) + 1);
    }

    // Everyone except the winner pays
    for (const [userId, sheetCount] of userSheetCounts) {
      if (userId !== winnerId) {
        payments.push({ userId, amount: sheetCount * pricePerSheet });
      }
    }

    // Penalized players who didn't buy sheets still pay base amount
    for (const penalizedUserId of state.penalizedPlayers) {
      if (!userSheetCounts.has(penalizedUserId)) {
        payments.push({ userId: penalizedUserId, amount: pricePerSheet });
      }
    }

    return payments;
  }

  async getSessionById(sessionId: number): Promise<GameSessionEntity | null> {
    return this.sessionRepository.findOne({ where: { id: sessionId } });
  }

  getState(sessionId: number): InMemoryGameState {
    const state = this.gameStates.get(sessionId);
    if (!state) {
      throw new BadRequestException('Game session not found');
    }
    return state;
  }

  async markCell(
    sessionId: number,
    userId: number,
    ticketId: number,
    rowIndex: number,
    colIndex: number,
    numberValue: number,
  ): Promise<void> {
    await this.markedCellRepository.save({
      sessionId,
      userId,
      ticketId,
      rowIndex,
      colIndex,
      numberValue,
    });
  }

  async unmarkCell(
    sessionId: number,
    userId: number,
    ticketId: number,
    rowIndex: number,
    colIndex: number,
  ): Promise<void> {
    await this.markedCellRepository.delete({
      sessionId,
      userId,
      ticketId,
      rowIndex,
      colIndex,
    });
  }

  private generateShuffledNumbers(): number[] {
    const numbers: number[] = [];
    for (let i = 1; i <= 90; i++) {
      numbers.push(i);
    }
    // Fisher-Yates shuffle
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    return numbers;
  }

  findSessionForRoom(
    roomId: number,
  ): { sessionId: number; state: InMemoryGameState } | null {
    for (const [sessionId, mappedRoomId] of this.sessionRoomMap) {
      if (mappedRoomId === roomId) {
        const state = this.gameStates.get(sessionId);
        if (state && state.status !== 'finished') {
          return { sessionId, state };
        }
      }
    }
    return null;
  }

  cleanupSession(sessionId: number): void {
    const state = this.gameStates.get(sessionId);
    if (state?.autoCallTimer) {
      clearInterval(state.autoCallTimer);
    }
    this.gameStates.delete(sessionId);
    this.sessionRoomMap.delete(sessionId);
  }
}
