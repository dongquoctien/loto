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

interface KinhClaimEntry {
  userId: number;
  ticketId: number;
  winType: WinType;
  lineDetails: LineDetails;
  preValidated: boolean;
  claimOrder: number;
}

interface ChallengeState {
  cards: number[];
  picks: Map<number, { cardIndex: number; value: number }>;
  participantIds: number[];
  timeoutTimer: ReturnType<typeof setTimeout> | null;
  status: 'picking' | 'done';
}

interface InMemoryGameState {
  calledNumbers: number[];
  remainingNumbers: number[];
  autoCallTimer: ReturnType<typeof setTimeout> | null;
  status: 'preparing' | 'active' | 'paused' | 'paused_for_kinh' | 'finished';
  purchasedSheets: Map<number, number>; // sheetId -> userId
  penalizedPlayers: Set<number>;
  kinhClaims: KinhClaimEntry[];
  challenge: ChallengeState | null;
}

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);
  private gameStates = new Map<number, InMemoryGameState>();
  // Maps sessionId -> roomId for reverse lookups
  private sessionRoomMap = new Map<number, number>();
  // Prevents concurrent session creation for the same room
  private sessionCreationLocks = new Map<number, Promise<GameSessionEntity>>();

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
      kinhClaims: [],
      challenge: null,
    });

    return savedSession;
  }

  /**
   * Get the active session for a room, recover from DB, or create a new one.
   * Uses a lock to prevent concurrent creation of duplicate sessions.
   */
  async getOrCreateSessionForRoom(
    roomId: number,
  ): Promise<{ sessionId: number; state: InMemoryGameState }> {
    // 1. Check in-memory first
    const existing = this.findSessionForRoom(roomId);
    if (existing) return existing;

    // 2. Try recovering from DB
    const recovered = await this.recoverSessionForRoom(roomId);
    if (recovered) return recovered;

    // 3. Create new session with lock to prevent duplicates
    if (this.sessionCreationLocks.has(roomId)) {
      // Another request is already creating a session — wait for it
      await this.sessionCreationLocks.get(roomId);
      // After waiting, the session should exist in memory
      const created = this.findSessionForRoom(roomId);
      if (created) return created;
    }

    const creationPromise = this.createSession(roomId);
    this.sessionCreationLocks.set(roomId, creationPromise);

    try {
      const session = await creationPromise;
      return { sessionId: session.id, state: this.getState(session.id) };
    } finally {
      this.sessionCreationLocks.delete(roomId);
    }
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
  ): Promise<{ preValidated: boolean; isFirstClaim: boolean; claimOrder: number }> {
    const state = this.getState(sessionId);

    if (state.status !== 'active' && state.status !== 'paused_for_kinh') {
      throw new BadRequestException('Game is not active');
    }

    if (state.penalizedPlayers.has(userId)) {
      throw new ForbiddenException('You have been penalized and cannot claim');
    }

    // Prevent duplicate claims from same user
    if (state.kinhClaims.some((c) => c.userId === userId)) {
      throw new BadRequestException('You have already claimed');
    }

    // Server-side pre-validation
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

    const isFirstClaim = state.kinhClaims.length === 0;
    const claimOrder = state.kinhClaims.length + 1;

    state.kinhClaims.push({ userId, ticketId, winType, lineDetails, preValidated, claimOrder });
    state.status = 'paused_for_kinh';

    await this.sessionRepository.update(sessionId, { status: 'paused_for_kinh' });

    return { preValidated, isFirstClaim, claimOrder };
  }

  async approveKinhForUser(sessionId: number, winnerId: number): Promise<GameResultEntity> {
    const state = this.getState(sessionId);
    const claim = state.kinhClaims.find((c) => c.userId === winnerId);

    if (!claim) {
      throw new BadRequestException('No pending kinh claim for this user');
    }

    state.status = 'finished';
    state.kinhClaims = [];
    this.clearChallengeTimer(sessionId);
    state.challenge = null;

    if (state.autoCallTimer) {
      clearInterval(state.autoCallTimer);
      state.autoCallTimer = null;
    }

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

  async rejectKinhForUser(sessionId: number, rejectedUserId: number): Promise<{ remainingClaims: number }> {
    const state = this.getState(sessionId);
    const claimIdx = state.kinhClaims.findIndex((c) => c.userId === rejectedUserId);

    if (claimIdx === -1) {
      throw new BadRequestException('No pending kinh claim for this user');
    }

    state.kinhClaims.splice(claimIdx, 1);
    state.penalizedPlayers.add(rejectedUserId);

    await this.penaltyRepository.save({
      sessionId,
      userId: rejectedUserId,
      reason: 'wrong_kinh',
      mustPay: true,
    });

    if (state.kinhClaims.length === 0) {
      state.status = 'active';
      this.clearChallengeTimer(sessionId);
      state.challenge = null;
      await this.sessionRepository.update(sessionId, { status: 'active' });
    }

    return { remainingClaims: state.kinhClaims.length };
  }

  startChallenge(sessionId: number): ChallengeState {
    const state = this.getState(sessionId);

    if (state.kinhClaims.length < 2) {
      throw new BadRequestException('Need at least 2 claims for a challenge');
    }

    // Generate 10 unique random numbers 0-99
    const cardValues: number[] = [];
    const usedValues = new Set<number>();
    while (cardValues.length < 10) {
      const v = Math.floor(Math.random() * 100);
      if (!usedValues.has(v)) {
        usedValues.add(v);
        cardValues.push(v);
      }
    }

    const challenge: ChallengeState = {
      cards: cardValues,
      picks: new Map(),
      participantIds: state.kinhClaims.map((c) => c.userId),
      timeoutTimer: null,
      status: 'picking',
    };

    state.challenge = challenge;
    return challenge;
  }

  pickChallengeCard(
    sessionId: number,
    userId: number,
    cardIndex: number,
  ): { value: number; allPicked: boolean } {
    const state = this.getState(sessionId);
    const challenge = state.challenge;

    if (!challenge || challenge.status !== 'picking') {
      throw new BadRequestException('No active challenge');
    }

    if (!challenge.participantIds.includes(userId)) {
      throw new ForbiddenException('You are not a challenge participant');
    }

    if (challenge.picks.has(userId)) {
      throw new BadRequestException('You have already picked a card');
    }

    // Check card not already taken
    for (const pick of challenge.picks.values()) {
      if (pick.cardIndex === cardIndex) {
        throw new BadRequestException('This card is already taken');
      }
    }

    if (cardIndex < 0 || cardIndex >= challenge.cards.length) {
      throw new BadRequestException('Invalid card index');
    }

    const value = challenge.cards[cardIndex];
    challenge.picks.set(userId, { cardIndex, value });

    const allPicked = challenge.picks.size === challenge.participantIds.length;

    return { value, allPicked };
  }

  resolveChallengeWinner(sessionId: number): {
    winnerId: number;
    picks: { userId: number; cardIndex: number; value: number }[];
    allCardValues: number[];
  } {
    const state = this.getState(sessionId);
    const challenge = state.challenge;

    if (!challenge) {
      throw new BadRequestException('No active challenge');
    }

    challenge.status = 'done';

    const picks: { userId: number; cardIndex: number; value: number }[] = [];
    let winnerId = -1;
    let highestValue = -1;

    for (const participantId of challenge.participantIds) {
      const pick = challenge.picks.get(participantId);
      if (pick) {
        picks.push({ userId: participantId, cardIndex: pick.cardIndex, value: pick.value });
        if (pick.value > highestValue) {
          highestValue = pick.value;
          winnerId = participantId;
        }
      } else {
        // Non-picker gets -1 (auto-lose)
        picks.push({ userId: participantId, cardIndex: -1, value: -1 });
      }
    }

    return { winnerId, picks, allCardValues: challenge.cards };
  }

  clearChallengeTimer(sessionId: number): void {
    const state = this.gameStates.get(sessionId);
    if (state?.challenge?.timeoutTimer) {
      clearTimeout(state.challenge.timeoutTimer);
      state.challenge.timeoutTimer = null;
    }
  }

  removeClaimForUser(sessionId: number, userId: number): void {
    const state = this.gameStates.get(sessionId);
    if (!state) return;
    state.kinhClaims = state.kinhClaims.filter((c) => c.userId !== userId);
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

  /**
   * Recover an active game session from DB into in-memory state.
   * Used when backend restarts or in-memory state is lost.
   * Returns null if no active session found in DB for this room.
   */
  async recoverSessionForRoom(
    roomId: number,
  ): Promise<{ sessionId: number; state: InMemoryGameState } | null> {
    // Check if already in memory
    const existing = this.findSessionForRoom(roomId);
    if (existing) return existing;

    // Look for non-finished session in DB
    const session = await this.sessionRepository.findOne({
      where: [
        { roomId, status: 'preparing' },
        { roomId, status: 'active' },
        { roomId, status: 'paused' },
        { roomId, status: 'paused_for_kinh' },
      ],
      order: { id: 'DESC' },
    });

    if (!session) return null;

    // Reconstruct called numbers in order
    const calledNumberEntities = await this.calledNumberRepository.find({
      where: { sessionId: session.id },
      order: { callOrder: 'ASC' },
    });
    const calledNumbers = calledNumberEntities.map((cn) => cn.numberValue);

    // Reconstruct remaining numbers: all 1-90 minus called, then shuffle
    const calledSet = new Set(calledNumbers);
    const remainingNumbers: number[] = [];
    for (let i = 1; i <= 90; i++) {
      if (!calledSet.has(i)) {
        remainingNumbers.push(i);
      }
    }
    // Shuffle remaining numbers
    for (let i = remainingNumbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remainingNumbers[i], remainingNumbers[j]] = [remainingNumbers[j], remainingNumbers[i]];
    }

    // Reconstruct purchased sheets
    const purchasedSheetEntities = await this.purchasedSheetRepository.find({
      where: { sessionId: session.id },
    });
    const purchasedSheets = new Map<number, number>();
    for (const ps of purchasedSheetEntities) {
      purchasedSheets.set(ps.sheetId, ps.userId);
    }

    // Reconstruct penalized players
    const penaltyEntities = await this.penaltyRepository.find({
      where: { sessionId: session.id },
    });
    const penalizedPlayers = new Set<number>();
    for (const p of penaltyEntities) {
      penalizedPlayers.add(p.userId);
    }

    // Cannot recover pending kinh claims from DB — if status was paused_for_kinh, resume to active
    let recoveredStatus = session.status;
    if (recoveredStatus === 'paused_for_kinh') {
      recoveredStatus = 'active';
      this.logger.warn(
        `Session ${session.id} was paused_for_kinh but claims cannot be recovered — resuming to active`,
      );
      this.sessionRepository.update(session.id, { status: 'active' });
    }

    const state: InMemoryGameState = {
      calledNumbers,
      remainingNumbers,
      autoCallTimer: null,
      status: recoveredStatus,
      purchasedSheets,
      penalizedPlayers,
      kinhClaims: [],
      challenge: null,
    };

    // Store in memory
    this.gameStates.set(session.id, state);
    this.sessionRoomMap.set(session.id, roomId);

    this.logger.log(
      `Recovered session ${session.id} for room ${roomId} from DB (status: ${recoveredStatus}, called: ${calledNumbers.length}, sheets: ${purchasedSheets.size})`,
    );

    return { sessionId: session.id, state };
  }

  async markCell(
    sessionId: number,
    userId: number,
    ticketId: number,
    rowIndex: number,
    colIndex: number,
    numberValue: number,
  ): Promise<void> {
    // Use upsert to avoid ER_DUP_ENTRY when user marks the same cell twice
    await this.markedCellRepository.upsert(
      { sessionId, userId, ticketId, rowIndex, colIndex, numberValue },
      ['sessionId', 'userId', 'ticketId', 'rowIndex', 'colIndex'],
    );
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

  /**
   * Get the set of number values that a user has marked for a specific ticket in a session.
   */
  async getMarkedNumbersForTicket(
    sessionId: number,
    userId: number,
    ticketId: number,
  ): Promise<Set<number>> {
    const marks = await this.markedCellRepository.find({
      where: { sessionId, userId, ticketId },
      select: ['numberValue'],
    });
    return new Set(marks.map((m) => m.numberValue));
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
    this.clearChallengeTimer(sessionId);
    this.gameStates.delete(sessionId);
    this.sessionRoomMap.delete(sessionId);
  }
}
