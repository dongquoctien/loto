import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { GameService } from '../game/game.service';
import { RoomService } from '../room/room.service';
import { TicketService } from '../ticket/ticket.service';
import { UserService } from '../user/user.service';
import { WinType, LineDetails, checkNearWins, TicketData } from '@loto/shared';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  username?: string;
  currentRoomId?: number;
}

// Grace period before notifying room about disconnect (allows reconnect)
const DISCONNECT_GRACE_MS = 15_000;

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/game',
  pingInterval: 10000,
  pingTimeout: 15000,
  transports: ['websocket', 'polling'],
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(GameGateway.name);

  @WebSocketServer()
  server: Server;

  // Maps userId -> socketId for reconnection
  private userSockets = new Map<number, string>();
  // Maps userId -> roomId (persists across reconnections)
  private userRooms = new Map<number, number>();
  // Maps userId -> disconnect timer (grace period)
  private disconnectTimers = new Map<number, ReturnType<typeof setTimeout>>();
  // Maps sessionId -> active auto-call interval
  private autoCallTimers = new Map<number, ReturnType<typeof setInterval>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly gameService: GameService,
    private readonly roomService: RoomService,
    private readonly ticketService: TicketService,
    private readonly userService: UserService,
  ) {}

  /** Broadcast room creation to all connected clients (for lobby updates) */
  broadcastRoomCreated(room: unknown) {
    this.server.emit('room:created', room);
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.username = payload.username;

      // Cancel any pending disconnect grace period for this user
      const pendingTimer = this.disconnectTimers.get(payload.sub);
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        this.disconnectTimers.delete(payload.sub);
        this.logger.log(`User ${payload.sub} reconnected within grace period`);
      }

      this.userSockets.set(payload.sub, client.id);

      client.emit('authenticated', { userId: payload.sub });
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (!client.userId) return;

    const userId = client.userId;
    const currentSocketId = this.userSockets.get(userId);

    // Only process if this is still the active socket for this user
    // (avoids race condition when user reconnects before old socket closes)
    if (currentSocketId !== client.id) return;

    // Start grace period — don't immediately notify room
    const timer = setTimeout(() => {
      this.disconnectTimers.delete(userId);
      this.userSockets.delete(userId);

      // Notify room about player going offline after grace period
      const roomId = this.userRooms.get(userId);
      if (roomId) {
        this.server.to(`room:${roomId}`).emit('room:player-left', {
          userId,
        });
        // Keep userRooms mapping so rejoin can restore state
      }

      this.logger.log(`User ${userId} disconnected (grace period expired)`);
    }, DISCONNECT_GRACE_MS);

    this.disconnectTimers.set(userId, timer);
  }

  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomCode: string; password?: string },
  ) {
    if (!client.userId) return;

    try {
      const room = await this.roomService.joinRoom(
        data.roomCode,
        client.userId,
        data.password,
      );
      client.currentRoomId = room.id;
      client.join(`room:${room.id}`);

      // Track user-room mapping for reconnection
      this.userRooms.set(client.userId, room.id);

      // Get current game session state if any
      const user = await this.userService.findById(client.userId);
      const rawSheets = await this.ticketService.getAllSheets();

      // Transform sheets to include tickets array (frontend expects this format)
      const sheets = rawSheets.map((s) => ({
        id: s.id,
        sheetNumber: s.sheetNumber,
        colorGroup: s.colorGroup,
        tickets: [s.ticket1, s.ticket2, s.ticket3].filter(Boolean).map((t) => ({
          id: t.id,
          ticketNumber: t.ticketNumber,
          colorGroup: t.colorGroup,
          rows: [t.row1, t.row2, t.row3],
        })),
      }));

      // Build session data for reconnection
      let sessionData: { id: number; status: string; calledNumbers: number[] } | undefined;
      let purchasedSheetsMap: Record<string, number> | undefined;
      let userMarkedCells: string[] = [];

      // Find the active session for this room (in-memory, DB recovery, or auto-create)
      // Uses lock to prevent duplicate session creation when multiple users join concurrently
      const state = await this.gameService.getOrCreateSessionForRoom(room.id);

      sessionData = {
        id: state.sessionId,
        status: state.state.status,
        calledNumbers: state.state.calledNumbers,
      };
      purchasedSheetsMap = {};
      for (const [sheetId, userId] of state.state.purchasedSheets) {
        purchasedSheetsMap[String(sheetId)] = userId;
      }

      // Restore user's marked cells from database (for reconnection after sleep/refresh)
      if (state.state.status === 'active' || state.state.status === 'paused_for_kinh') {
        userMarkedCells = await this.gameService.getUserMarkedCells(state.sessionId, client.userId);
      }

      client.emit('room:joined', {
        room: {
          id: room.id,
          roomCode: room.roomCode,
          name: room.name,
          ownerId: room.ownerId,
          callMode: room.callMode,
          callVoice: room.callVoice,
          autoCallInterval: room.autoCallInterval,
          pricePerSheet: room.pricePerSheet,
          winHorizontal: room.winHorizontal,
          winVertical: room.winVertical,
          winDiagonal: room.winDiagonal,
          allowHandsFree: room.allowHandsFree,
          status: room.status,
        },
        players: room.players.map((p) => ({
          userId: p.userId,
          displayName: p.user?.displayName || p.user?.username,
          avatarUrl: p.user?.avatarUrl,
          isOnline: p.isOnline,
          isReady: p.isReady,
          winCount: p.user?.winCount ?? 0,
        })),
        sheets,
        session: sessionData,
        purchasedSheets: purchasedSheetsMap,
        markedCells: userMarkedCells,
      });

      // If game is paused for kinh, send claims to reconnecting client
      if (state.state.status === 'paused_for_kinh' && state.state.kinhClaims.length > 0) {
        const claimsPayload = await this.buildClaimsPayload(state.sessionId);
        client.emit('kinh:claims-updated', claimsPayload);

        // If client is owner, also send verify data
        if (room.ownerId === client.userId) {
          const verifyPayload = await this.buildVerifyPayloads(state.sessionId);
          client.emit('kinh:verify-request', verifyPayload);
        }
      }

      // Notify others
      client.to(`room:${room.id}`).emit('room:player-joined', {
        userId: client.userId,
        displayName: user.displayName || user.username,
        avatarUrl: user.avatarUrl,
        winCount: user.winCount ?? 0,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to join room';
      client.emit('error', { message });
    }
  }

  @SubscribeMessage('room:leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: number },
  ) {
    if (!client.userId) return;

    const isOwner = await this.roomService.isOwner(data.roomId, client.userId);

    if (isOwner) {
      // Owner leaving: stop any active game, kick all players, delete room
      const existing = this.gameService.findSessionForRoom(data.roomId);
      if (existing) {
        this.stopAutoCall(existing.sessionId);
        this.gameService.cleanupSession(existing.sessionId);
      }

      // Notify all players to leave
      this.server.to(`room:${data.roomId}`).emit('room:dissolved', {
        reason: 'Chủ phòng đã rời phòng. Phòng đã bị xóa.',
      });

      // Force disconnect all sockets from the room + cleanup userRooms
      const sockets = await this.server.in(`room:${data.roomId}`).fetchSockets();
      for (const sock of sockets) {
        sock.leave(`room:${data.roomId}`);
        (sock as any).currentRoomId = undefined;
        if ((sock as any).userId) {
          this.userRooms.delete((sock as any).userId);
        }
      }

      // Delete room from DB
      await this.roomService.deleteRoom(data.roomId);

      // Notify all clients (lobby) that room was deleted
      this.server.emit('room:deleted', { roomId: data.roomId });
    } else {
      const activeSession = this.gameService.findSessionForRoom(data.roomId);

      if (activeSession) {
        const status = activeSession.state.status;
        const hasSheets = [...activeSession.state.purchasedSheets.values()].includes(client.userId);

        // Block leaving only if user has purchased sheets and game is in progress
        if (hasSheets && (status === 'active' || status === 'paused' || status === 'paused_for_kinh')) {
          client.emit('error', {
            message: 'Không thể rời phòng khi trò chơi đang diễn ra.',
          });
          return;
        }

        // Remove any active kinh claims from the leaving player
        this.gameService.removeClaimForUser(activeSession.sessionId, client.userId);

        // Release purchased sheets
        const freedSheetIds = await this.gameService.releaseUserSheets(
          activeSession.sessionId,
          client.userId,
        );

        // Notify remaining players which sheets are now available again
        if (freedSheetIds.length > 0) {
          this.server.to(`room:${data.roomId}`).emit('sheet:released', {
            sheetIds: freedSheetIds,
            userId: client.userId,
          });
        }
      }

      await this.roomService.leaveRoom(data.roomId, client.userId);
      client.leave(`room:${data.roomId}`);
      client.currentRoomId = undefined;
      this.userRooms.delete(client.userId);

      this.server.to(`room:${data.roomId}`).emit('room:player-left', {
        userId: client.userId,
      });
    }
  }

  @SubscribeMessage('sheet:purchase')
  async handlePurchaseSheet(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: number; sheetId: number },
  ) {
    if (!client.userId) return;

    try {
      await this.gameService.purchaseSheet(data.sessionId, client.userId, data.sheetId);

      // Get sheet's tickets to send to clients
      const sheet = await this.ticketService.getSheetById(data.sheetId);
      const tickets = sheet
        ? [sheet.ticket1, sheet.ticket2, sheet.ticket3]
            .filter(Boolean)
            .map((t) => ({
              id: t.id,
              ticketNumber: t.ticketNumber,
              colorGroup: t.colorGroup,
              rows: [t.row1, t.row2, t.row3],
            }))
        : [];

      // Notify all in room that sheet is taken (including the buyer for confirmation)
      if (client.currentRoomId) {
        this.server.to(`room:${client.currentRoomId}`).emit('sheet:taken', {
          sheetId: data.sheetId,
          userId: client.userId,
          tickets,
        });
      }

      // Also send acknowledgment directly to the buyer
      client.emit('sheet:purchase-confirmed', {
        sheetId: data.sheetId,
        success: true,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to purchase sheet';
      client.emit('sheet:purchase-confirmed', {
        sheetId: data.sheetId,
        success: false,
        error: message,
      });
      client.emit('error', { message });
    }
  }

  @SubscribeMessage('sheet:return')
  async handleReturnSheet(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: number; sheetId: number },
  ) {
    if (!client.userId) return;

    try {
      await this.gameService.returnSheet(data.sessionId, client.userId, data.sheetId);

      if (client.currentRoomId) {
        this.server.to(`room:${client.currentRoomId}`).emit('sheet:released', {
          sheetIds: [data.sheetId],
          userId: client.userId,
        });

        // Auto-unready when player returns a sheet and has no sheets left
        const state = this.gameService.getState(data.sessionId);
        const userSheetCount = [...state.purchasedSheets.values()].filter(
          (uid) => uid === client.userId,
        ).length;

        if (userSheetCount === 0) {
          await this.roomService.setPlayerReady(client.currentRoomId, client.userId, false);
          this.server.to(`room:${client.currentRoomId}`).emit('player:ready-changed', {
            userId: client.userId,
            isReady: false,
          });
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to return sheet';
      client.emit('error', { message });
    }
  }

  @SubscribeMessage('player:set-ready')
  async handleSetReady(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { ready: boolean },
  ) {
    if (!client.userId || !client.currentRoomId) return;

    try {
      const room = await this.roomService.findById(client.currentRoomId);

      // Owner không cần ready (họ có nút start)
      if (room.ownerId === client.userId) {
        client.emit('error', { message: 'Chủ phòng không cần sẵn sàng' });
        return;
      }

      // Chỉ cho phép khi room đang waiting
      if (room.status !== 'waiting') {
        client.emit('error', { message: 'Game đã bắt đầu' });
        return;
      }

      // Kiểm tra player đã mua tờ vé chưa
      if (data.ready) {
        const session = this.gameService.findSessionForRoom(client.currentRoomId);
        if (session) {
          const userSheetCount = [...session.state.purchasedSheets.values()].filter(
            (uid) => uid === client.userId,
          ).length;

          if (userSheetCount === 0) {
            client.emit('error', { message: 'Bạn cần mua ít nhất 1 tờ vé để sẵn sàng' });
            return;
          }
        }
      }

      // Update database
      await this.roomService.setPlayerReady(client.currentRoomId, client.userId, data.ready);

      // Broadcast tới cả phòng
      this.server.to(`room:${client.currentRoomId}`).emit('player:ready-changed', {
        userId: client.userId,
        isReady: data.ready,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to set ready status';
      client.emit('error', { message });
    }
  }

  @SubscribeMessage('game:start')
  async handleStartGame(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: number },
  ) {
    if (!client.userId) return;

    try {
      const room = await this.roomService.findById(data.roomId);
      if (room.ownerId !== client.userId) {
        client.emit('error', { message: 'Only room owner can start the game' });
        return;
      }

      // Find existing 'preparing' session (created on room:join) instead of making a new one
      const existing = this.gameService.findSessionForRoom(data.roomId);
      let sessionId: number;
      let sessionNumber: number;

      if (existing && existing.state.status === 'preparing') {
        sessionId = existing.sessionId;
        // Fetch session number from DB
        const sessionEntity = await this.gameService.getSessionById(sessionId);
        sessionNumber = sessionEntity?.sessionNumber ?? 1;
      } else {
        // Fallback: create a new session if none exists
        const session = await this.gameService.createSession(data.roomId);
        sessionId = session.id;
        sessionNumber = session.sessionNumber;
      }

      await this.gameService.startGame(sessionId);

      // Reset all players' ready status when game starts
      await this.roomService.resetAllPlayersReady(data.roomId);

      this.server.to(`room:${data.roomId}`).emit('game:started', {
        sessionId,
        sessionNumber,
      });

      // Start auto-call if configured
      if (room.callMode === 'auto') {
        this.startAutoCall(sessionId, data.roomId, room.autoCallInterval);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to start game';
      client.emit('error', { message });
    }
  }

  @SubscribeMessage('game:call-number')
  async handleCallNumber(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: number },
  ) {
    if (!client.userId || !client.currentRoomId) return;

    const room = await this.roomService.findById(client.currentRoomId);
    if (room.ownerId !== client.userId) {
      client.emit('error', { message: 'Only room owner can call numbers' });
      return;
    }

    this.callAndBroadcastNumber(data.sessionId, client.currentRoomId);
  }

  @SubscribeMessage('game:toggle-auto-call')
  async handleToggleAutoCall(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: number; enabled: boolean },
  ) {
    if (!client.userId || !client.currentRoomId) return;

    const room = await this.roomService.findById(client.currentRoomId);
    if (room.ownerId !== client.userId) return;

    if (data.enabled) {
      this.startAutoCall(data.sessionId, client.currentRoomId, room.autoCallInterval);
    } else {
      this.stopAutoCall(data.sessionId);
    }
  }

  @SubscribeMessage('ticket:mark-cell')
  async handleMarkCell(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      sessionId: number;
      ticketId: number;
      row: number;
      col: number;
      number: number;
    },
  ) {
    if (!client.userId) return;

    try {
      await this.gameService.markCell(
        data.sessionId,
        client.userId,
        data.ticketId,
        data.row,
        data.col,
        data.number,
      );
    } catch (error: unknown) {
      // Silently ignore duplicate mark errors (user clicked twice)
      if (error instanceof Error && error.message?.includes('ER_DUP_ENTRY')) {
        return;
      }
      this.logger.error(`Failed to mark cell: ${error}`);
    }
  }

  @SubscribeMessage('ticket:unmark-cell')
  async handleUnmarkCell(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      sessionId: number;
      ticketId: number;
      row: number;
      col: number;
    },
  ) {
    if (!client.userId) return;

    await this.gameService.unmarkCell(
      data.sessionId,
      client.userId,
      data.ticketId,
      data.row,
      data.col,
    );
  }

  @SubscribeMessage('kinh:claim')
  async handleKinhClaim(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      sessionId: number;
      ticketId: number;
      winType: WinType;
      lineDetails: LineDetails;
    },
  ) {
    if (!client.userId || !client.currentRoomId) return;

    try {
      const { isFirstClaim } = await this.gameService.handleKinhClaim(
        data.sessionId,
        client.userId,
        data.ticketId,
        data.winType,
        data.lineDetails,
      );

      // On first claim: stop auto-call and pause game
      if (isFirstClaim) {
        this.stopAutoCall(data.sessionId);
        this.server.to(`room:${client.currentRoomId}`).emit('game:paused');
      }

      // Build and broadcast updated claims to all players
      const claimsPayload = await this.buildClaimsPayload(data.sessionId);
      this.server.to(`room:${client.currentRoomId}`).emit('kinh:claims-updated', claimsPayload);

      // Send verify request to owner
      const room = await this.roomService.findById(client.currentRoomId);
      const ownerSocketId = this.userSockets.get(room.ownerId);
      if (ownerSocketId) {
        const verifyPayload = await this.buildVerifyPayloads(data.sessionId);
        this.server.to(ownerSocketId).emit('kinh:verify-request', verifyPayload);
      }

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Kinh claim failed';
      client.emit('error', { message });
    }
  }

  @SubscribeMessage('kinh:approve')
  async handleKinhApprove(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: number; userId: number },
  ) {
    if (!client.userId || !client.currentRoomId) return;

    const room = await this.roomService.findById(client.currentRoomId);
    if (room.ownerId !== client.userId) return;

    try {
      await this.announceWinner(data.sessionId, data.userId, client.currentRoomId, room);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to approve kinh';
      client.emit('error', { message });
    }
  }

  @SubscribeMessage('kinh:reject')
  async handleKinhReject(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: number; userId: number },
  ) {
    if (!client.userId || !client.currentRoomId) return;

    const room = await this.roomService.findById(client.currentRoomId);
    if (room.ownerId !== client.userId) return;

    try {
      const { remainingClaims } = await this.gameService.rejectKinhForUser(data.sessionId, data.userId);

      // Notify the rejected player
      const cheaterSocketId = this.userSockets.get(data.userId);
      if (cheaterSocketId) {
        this.server.to(cheaterSocketId).emit('kinh:rejected-you', {
          reason: 'Kinh sai - bạn bị phạt!',
        });
      }

      // Notify everyone
      this.server.to(`room:${client.currentRoomId}`).emit('kinh:rejected', {
        userId: data.userId,
      });

      if (remainingClaims > 0) {
        // Update claims for all players
        const claimsPayload = await this.buildClaimsPayload(data.sessionId);
        this.server.to(`room:${client.currentRoomId}`).emit('kinh:claims-updated', claimsPayload);

        // Update verify for owner
        const ownerSocketId = this.userSockets.get(room.ownerId);
        if (ownerSocketId) {
          const verifyPayload = await this.buildVerifyPayloads(data.sessionId);
          this.server.to(ownerSocketId).emit('kinh:verify-request', verifyPayload);
        }
      } else {
        // No claims left — resume game
        this.server.to(`room:${client.currentRoomId}`).emit('game:resumed');

        if (room.callMode === 'auto') {
          this.startAutoCall(data.sessionId, client.currentRoomId, room.autoCallInterval);
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to reject kinh';
      client.emit('error', { message });
    }
  }

  @SubscribeMessage('kinh:start-challenge')
  async handleStartChallenge(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: number },
  ) {
    if (!client.userId || !client.currentRoomId) return;

    const room = await this.roomService.findById(client.currentRoomId);
    if (room.ownerId !== client.userId) return;

    try {
      const challenge = this.gameService.startChallenge(data.sessionId);
      const roomId = client.currentRoomId;

      // Build participants list with user info
      const participants = await Promise.all(
        challenge.participantIds.map(async (uid) => {
          const u = await this.userService.findById(uid);
          return {
            userId: uid,
            displayName: u.displayName || u.username,
            avatarUrl: u.avatarUrl,
          };
        }),
      );

      const timeoutSeconds = 30;

      this.server.to(`room:${roomId}`).emit('challenge:started', {
        cardCount: 10,
        participants,
        timeoutSeconds,
      });

      // Start timeout timer
      const timer = setTimeout(() => {
        this.resolveChallengeTimeout(data.sessionId, roomId);
      }, timeoutSeconds * 1000);

      const state = this.gameService.getState(data.sessionId);
      if (state.challenge) {
        state.challenge.timeoutTimer = timer;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to start challenge';
      client.emit('error', { message });
    }
  }

  @SubscribeMessage('challenge:pick-card')
  async handleChallengePickCard(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: number; cardIndex: number },
  ) {
    if (!client.userId || !client.currentRoomId) return;

    try {
      const { value, allPicked } = this.gameService.pickChallengeCard(
        data.sessionId,
        client.userId,
        data.cardIndex,
      );

      const user = await this.userService.findById(client.userId);

      // Broadcast card picked (no value) to room
      this.server.to(`room:${client.currentRoomId}`).emit('challenge:card-picked', {
        userId: client.userId,
        displayName: user.displayName || user.username,
        cardIndex: data.cardIndex,
      });

      // Send value privately to picker
      client.emit('challenge:your-pick', {
        cardIndex: data.cardIndex,
        value,
      });

      if (allPicked) {
        await this.resolveChallenge(data.sessionId, client.currentRoomId);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to pick card';
      client.emit('error', { message });
    }
  }

  @SubscribeMessage('game:pause')
  async handleGamePause(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: number },
  ) {
    if (!client.userId || !client.currentRoomId) return;

    const room = await this.roomService.findById(client.currentRoomId);
    if (room.ownerId !== client.userId) {
      client.emit('error', { message: 'Only room owner can pause the game' });
      return;
    }

    try {
      await this.gameService.pauseGame(data.sessionId);
      this.stopAutoCall(data.sessionId);

      this.server.to(`room:${client.currentRoomId}`).emit('game:paused', {
        reason: 'owner',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to pause game';
      client.emit('error', { message });
    }
  }

  @SubscribeMessage('game:resume')
  async handleGameResume(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: number },
  ) {
    if (!client.userId || !client.currentRoomId) return;

    const room = await this.roomService.findById(client.currentRoomId);
    if (room.ownerId !== client.userId) {
      client.emit('error', { message: 'Only room owner can resume the game' });
      return;
    }

    try {
      await this.gameService.resumeGame(data.sessionId);

      this.server.to(`room:${client.currentRoomId}`).emit('game:resumed', {
        reason: 'owner',
      });

      // Resume auto-call if applicable
      if (room.callMode === 'auto') {
        this.startAutoCall(data.sessionId, client.currentRoomId, room.autoCallInterval);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to resume game';
      client.emit('error', { message });
    }
  }

  @SubscribeMessage('game:reset')
  async handleGameReset(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: number },
  ) {
    if (!client.userId) return;

    const room = await this.roomService.findById(data.roomId);
    if (room.ownerId !== client.userId) return;

    // Stop any auto-call timers and challenge timers for existing session
    const existing = this.gameService.findSessionForRoom(data.roomId);
    if (existing) {
      this.stopAutoCall(existing.sessionId);
      this.gameService.clearChallengeTimer(existing.sessionId);
    }

    // Full reset: cleanup old session + create fresh one
    const session = await this.gameService.resetGame(data.roomId);

    // Reset all players' ready status when game resets
    await this.roomService.resetAllPlayersReady(data.roomId);

    this.server.to(`room:${data.roomId}`).emit('game:reset', {
      sessionId: session.id,
      sessionNumber: session.sessionNumber,
    });
  }

  private callAndBroadcastNumber(sessionId: number, roomId: number): void {
    const number = this.gameService.callNextNumber(sessionId);
    if (number === null) {
      this.stopAutoCall(sessionId);
      this.server.to(`room:${roomId}`).emit('game:all-numbers-called');
      return;
    }

    const state = this.gameService.getState(sessionId);
    this.server.to(`room:${roomId}`).emit('game:number-called', {
      number,
      calledNumbers: state.calledNumbers,
      remaining: state.remainingNumbers.length,
    });

    // Check near-wins for all players after each number called
    this.checkAndBroadcastNearWins(sessionId, roomId).catch((err) => {
      // Non-critical: don't break the game flow
    });
  }

  private async checkAndBroadcastNearWins(sessionId: number, roomId: number): Promise<void> {
    const state = this.gameService.getState(sessionId);
    const calledSet = new Set(state.calledNumbers);

    const room = await this.roomService.findById(roomId);
    const enabledWinTypes = {
      horizontal: room.winHorizontal,
      vertical: room.winVertical,
      diagonal: room.winDiagonal,
    };

    // Collect userId -> sheetIds from purchased sheets
    const userSheets = new Map<number, number[]>();
    for (const [sheetId, userId] of state.purchasedSheets) {
      if (!userSheets.has(userId)) userSheets.set(userId, []);
      userSheets.get(userId)!.push(sheetId);
    }

    for (const [userId, sheetIds] of userSheets) {
      // Skip penalized players
      if (state.penalizedPlayers.has(userId)) continue;

      let totalNearWinCount = 0;
      for (const sheetId of sheetIds) {
        const sheet = await this.ticketService.getSheetById(sheetId);
        if (!sheet) continue;

        const tickets = [sheet.ticket1, sheet.ticket2, sheet.ticket3].filter(Boolean);
        for (const ticket of tickets) {
          const ticketData: TicketData = {
            id: ticket.id,
            ticketNumber: ticket.ticketNumber,
            colorGroup: ticket.colorGroup as TicketData['colorGroup'],
            rows: [ticket.row1, ticket.row2, ticket.row3] as TicketData['rows'],
          };

          // Build the intersection of called ∩ marked for this user's ticket
          const markedNumbers = await this.gameService.getMarkedNumbersForTicket(sessionId, userId, ticket.id);
          const effectiveSet = new Set<number>();
          for (const num of calledSet) {
            if (markedNumbers.has(num)) {
              effectiveSet.add(num);
            }
          }

          const nearWins = checkNearWins(ticketData, effectiveSet, enabledWinTypes);
          totalNearWinCount += nearWins.length;
        }
      }

      if (totalNearWinCount > 0) {
        const user = await this.userService.findById(userId);
        this.server.to(`room:${roomId}`).emit('player:near-win', {
          userId,
          displayName: user.displayName || user.username,
          avatarUrl: user.avatarUrl,
          nearWinCount: totalNearWinCount,
        });
      }
    }
  }

  private startAutoCall(sessionId: number, roomId: number, intervalSeconds: number): void {
    this.stopAutoCall(sessionId);

    const timer = setInterval(() => {
      const state = this.gameService.getState(sessionId);
      if (state.status !== 'active') {
        this.stopAutoCall(sessionId);
        return;
      }
      this.callAndBroadcastNumber(sessionId, roomId);
    }, intervalSeconds * 1000);

    this.autoCallTimers.set(sessionId, timer);
  }

  private stopAutoCall(sessionId: number): void {
    const timer = this.autoCallTimers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.autoCallTimers.delete(sessionId);
    }
  }

  private async buildClaimsPayload(sessionId: number) {
    const state = this.gameService.getState(sessionId);
    const claims = await Promise.all(
      state.kinhClaims.map(async (claim) => {
        const user = await this.userService.findById(claim.userId);
        const ticket = await this.ticketService.getTicketById(claim.ticketId);
        const ticketRows = ticket ? [ticket.row1, ticket.row2, ticket.row3] : null;
        const winningNumbers = this.extractWinningNumbers(ticketRows, claim.winType, claim.lineDetails);
        return {
          userId: claim.userId,
          displayName: user.displayName || user.username,
          avatarUrl: user.avatarUrl,
          winType: claim.winType,
          winningNumbers,
          claimOrder: claim.claimOrder,
        };
      }),
    );
    return { claims };
  }

  private async buildVerifyPayloads(sessionId: number) {
    const state = this.gameService.getState(sessionId);
    const claims = await Promise.all(
      state.kinhClaims.map(async (claim) => {
        const user = await this.userService.findById(claim.userId);
        const ticket = await this.ticketService.getTicketById(claim.ticketId);
        const markedCells = ticket
          ? await this.buildMarkedCellsForTicket(sessionId, claim.userId, ticket)
          : [];
        return {
          userId: claim.userId,
          displayName: user.displayName || user.username,
          ticket: ticket
            ? {
                id: ticket.id,
                ticketNumber: ticket.ticketNumber,
                colorGroup: ticket.colorGroup,
                rows: [ticket.row1, ticket.row2, ticket.row3],
              }
            : null,
          markedCells,
          calledNumbers: state.calledNumbers,
          winType: claim.winType,
          lineDetails: claim.lineDetails,
          preValidated: claim.preValidated,
        };
      }),
    );
    return { claims };
  }

  private async buildMarkedCellsForTicket(
    sessionId: number,
    userId: number,
    ticket: any,
  ): Promise<{ ticketId: number; rowIndex: number; colIndex: number; numberValue: number }[]> {
    const calledSet = new Set(this.gameService.getState(sessionId).calledNumbers);
    const rows = [ticket.row1, ticket.row2, ticket.row3];
    const result: { ticketId: number; rowIndex: number; colIndex: number; numberValue: number }[] = [];
    for (let ri = 0; ri < rows.length; ri++) {
      for (let ci = 0; ci < rows[ri].length; ci++) {
        const cell = rows[ri][ci];
        if (cell !== null && calledSet.has(cell)) {
          result.push({ ticketId: ticket.id, rowIndex: ri, colIndex: ci, numberValue: cell });
        }
      }
    }
    return result;
  }

  private extractWinningNumbers(
    ticketRows: ((number | null)[])[] | null,
    winType: string,
    lineDetails: LineDetails | null,
  ): number[] {
    if (!ticketRows || !lineDetails) return [];
    const nums: number[] = [];
    if (winType === 'horizontal' && lineDetails.rowIndex !== undefined) {
      const row = ticketRows[lineDetails.rowIndex];
      if (row) {
        for (const cell of row) {
          if (cell !== null && cell !== 0) nums.push(cell);
        }
      }
    } else if (winType === 'vertical' && lineDetails.colIndex !== undefined) {
      for (const row of ticketRows) {
        if (row) {
          const cell = row[lineDetails.colIndex!];
          if (cell !== null && cell !== 0) nums.push(cell);
        }
      }
    } else if (winType === 'diagonal') {
      const startCol = lineDetails.startCol ?? 0;
      const isMain = lineDetails.direction === 'main';
      for (let r = 0; r < ticketRows.length; r++) {
        const c = isMain ? startCol + r : startCol - r;
        if (c >= 0 && c < (ticketRows[r]?.length ?? 0)) {
          const cell = ticketRows[r][c];
          if (cell !== null && cell !== 0) nums.push(cell);
        }
      }
    }
    return nums;
  }

  private async announceWinner(
    sessionId: number,
    winnerId: number,
    roomId: number,
    room: any,
  ): Promise<void> {
    const state = this.gameService.getState(sessionId);
    const result = await this.gameService.approveKinhForUser(sessionId, winnerId);
    await this.userService.incrementWinCount(winnerId);
    const winner = await this.userService.findById(winnerId);
    const payments = this.gameService.calculatePayments(
      sessionId,
      room.pricePerSheet,
      winnerId,
    );

    const paymentReport: {
      userId: number;
      displayName: string;
      avatarUrl: string | null;
      sheetCount: number;
      amount: number;
    }[] = [];

    const userSheetCounts = new Map<number, number>();
    for (const [, userId] of state.purchasedSheets) {
      userSheetCounts.set(userId, (userSheetCounts.get(userId) || 0) + 1);
    }

    for (const payment of payments) {
      const paymentUser = await this.userService.findById(payment.userId);
      paymentReport.push({
        userId: payment.userId,
        displayName: paymentUser.displayName || paymentUser.username,
        avatarUrl: paymentUser.avatarUrl,
        sheetCount: userSheetCounts.get(payment.userId) || 0,
        amount: payment.amount,
      });
    }

    const totalWinAmount = paymentReport.reduce((sum, p) => sum + p.amount, 0);
    const winnerSocketId = this.userSockets.get(winnerId);

    this.server.to(`room:${roomId}`).emit('kinh:winner-announcement', {
      winnerId,
      displayName: winner.displayName || winner.username,
      avatarUrl: winner.avatarUrl,
      qrCodeUrl: winner.qrCodeUrl,
      winType: result.winType,
      ticketId: result.winningTicketId,
      paymentReport,
      totalWinAmount,
    });

    if (winnerSocketId) {
      this.server.to(winnerSocketId).emit('kinh:you-won', {
        winType: result.winType,
        ticketId: result.winningTicketId,
      });
    }

    for (const payment of payments) {
      const socketId = this.userSockets.get(payment.userId);
      if (socketId) {
        this.server.to(socketId).emit('payment:required', {
          amount: payment.amount,
          winnerId,
          winnerDisplayName: winner.displayName || winner.username,
          winnerQrCodeUrl: winner.qrCodeUrl,
        });
      }
    }
  }

  private async resolveChallenge(sessionId: number, roomId: number): Promise<void> {
    this.gameService.clearChallengeTimer(sessionId);
    const { winnerId, picks, allCardValues } = this.gameService.resolveChallengeWinner(sessionId);

    // Build picks with display names
    const picksWithNames = await Promise.all(
      picks.map(async (p) => {
        const u = await this.userService.findById(p.userId);
        return {
          userId: p.userId,
          displayName: u.displayName || u.username,
          cardIndex: p.cardIndex,
          value: p.value,
        };
      }),
    );

    const winnerUser = winnerId > 0 ? await this.userService.findById(winnerId) : null;

    this.server.to(`room:${roomId}`).emit('challenge:result', {
      winnerId,
      winnerDisplayName: winnerUser ? (winnerUser.displayName || winnerUser.username) : '',
      picks: picksWithNames,
      allCardValues,
    });

    // Auto-approve winner after 4s delay
    if (winnerId > 0) {
      setTimeout(async () => {
        try {
          const room = await this.roomService.findById(roomId);
          await this.announceWinner(sessionId, winnerId, roomId, room);
        } catch (err) {
          this.logger.error('Failed to auto-approve challenge winner', err);
        }
      }, 4000);
    }
  }

  private async resolveChallengeTimeout(sessionId: number, roomId: number): Promise<void> {
    try {
      const state = this.gameService.getState(sessionId);
      if (!state.challenge || state.challenge.status !== 'picking') return;

      // Auto-pick cards for non-pickers, sorted by username alphabetically
      const nonPickerIds = state.challenge.participantIds.filter(
        (id) => !state.challenge!.picks.has(id),
      );

      if (nonPickerIds.length > 0) {
        // Get usernames for sorting
        const nonPickerUsers = await Promise.all(
          nonPickerIds.map(async (uid) => {
            const u = await this.userService.findById(uid);
            return { userId: uid, username: (u.displayName || u.username).toLowerCase() };
          }),
        );
        nonPickerUsers.sort((a, b) => a.username.localeCompare(b.username));

        // Find available card indices (not already taken)
        const takenIndices = new Set(
          Array.from(state.challenge.picks.values()).map((p) => p.cardIndex),
        );
        const availableIndices = [];
        for (let i = 0; i < state.challenge.cards.length; i++) {
          if (!takenIndices.has(i)) availableIndices.push(i);
        }

        // Auto-assign cards in order
        for (let i = 0; i < nonPickerUsers.length && i < availableIndices.length; i++) {
          const cardIndex = availableIndices[i];
          const value = state.challenge.cards[cardIndex];
          state.challenge.picks.set(nonPickerUsers[i].userId, { cardIndex, value });
        }
      }

      // Resolve with all picks (manual + auto-assigned)
      await this.resolveChallenge(sessionId, roomId);
    } catch (err) {
      this.logger.error('Failed to resolve challenge timeout', err);
    }
  }

  private findActiveSessionForRoom(roomId: number) {
    return this.gameService.findSessionForRoom(roomId);
  }
}
