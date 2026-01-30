import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { GameService } from '../game/game.service';
import { RoomService } from '../room/room.service';
import { TicketService } from '../ticket/ticket.service';
import { UserService } from '../user/user.service';
import { WinType, LineDetails } from '@loto/shared';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  username?: string;
  currentRoomId?: number;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/game',
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Maps userId -> socketId for reconnection
  private userSockets = new Map<number, string>();
  // Maps sessionId -> active auto-call interval
  private autoCallTimers = new Map<number, ReturnType<typeof setInterval>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly gameService: GameService,
    private readonly roomService: RoomService,
    private readonly ticketService: TicketService,
    private readonly userService: UserService,
  ) {}

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
      this.userSockets.set(payload.sub, client.id);

      client.emit('authenticated', { userId: payload.sub });
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.userSockets.delete(client.userId);

      // Notify room about player going offline
      if (client.currentRoomId) {
        this.server
          .to(`room:${client.currentRoomId}`)
          .emit('room:player-left', {
            userId: client.userId,
          });
      }
    }
  }

  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomCode: string },
  ) {
    if (!client.userId) return;

    try {
      const room = await this.roomService.joinRoom(data.roomCode, client.userId);
      client.currentRoomId = room.id;
      client.join(`room:${room.id}`);

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

      // Find the latest active session for this room, or auto-create one
      let state = this.findActiveSessionForRoom(room.id);
      if (!state) {
        // Auto-create a session in 'preparing' status so players can purchase sheets
        const session = await this.gameService.createSession(room.id);
        state = { sessionId: session.id, state: this.gameService.getState(session.id) };
      }

      sessionData = {
        id: state.sessionId,
        status: state.state.status,
        calledNumbers: state.state.calledNumbers,
      };
      purchasedSheetsMap = {};
      for (const [sheetId, userId] of state.state.purchasedSheets) {
        purchasedSheetsMap[String(sheetId)] = userId;
      }

      client.emit('room:joined', {
        room: {
          id: room.id,
          roomCode: room.roomCode,
          name: room.name,
          ownerId: room.ownerId,
          callMode: room.callMode,
          autoCallInterval: room.autoCallInterval,
          pricePerSheet: room.pricePerSheet,
          winHorizontal: room.winHorizontal,
          winVertical: room.winVertical,
          winDiagonal: room.winDiagonal,
          status: room.status,
        },
        players: room.players.map((p) => ({
          userId: p.userId,
          displayName: p.user?.displayName || p.user?.username,
          avatarUrl: p.user?.avatarUrl,
          isOnline: p.isOnline,
        })),
        sheets,
        session: sessionData,
        purchasedSheets: purchasedSheetsMap,
      });

      // Notify others
      client.to(`room:${room.id}`).emit('room:player-joined', {
        userId: client.userId,
        displayName: user.displayName || user.username,
        avatarUrl: user.avatarUrl,
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

      // Force disconnect all sockets from the room
      const sockets = await this.server.in(`room:${data.roomId}`).fetchSockets();
      for (const sock of sockets) {
        sock.leave(`room:${data.roomId}`);
        (sock as any).currentRoomId = undefined;
      }

      // Delete room from DB
      await this.roomService.deleteRoom(data.roomId);
    } else {
      await this.roomService.leaveRoom(data.roomId, client.userId);
      client.leave(`room:${data.roomId}`);
      client.currentRoomId = undefined;

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

      // Notify all in room that sheet is taken
      if (client.currentRoomId) {
        this.server.to(`room:${client.currentRoomId}`).emit('sheet:taken', {
          sheetId: data.sheetId,
          userId: client.userId,
          tickets,
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to purchase sheet';
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

    await this.gameService.markCell(
      data.sessionId,
      client.userId,
      data.ticketId,
      data.row,
      data.col,
      data.number,
    );
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
      // Pause auto-call
      this.stopAutoCall(data.sessionId);

      const { preValidated } = await this.gameService.handleKinhClaim(
        data.sessionId,
        client.userId,
        data.ticketId,
        data.winType,
        data.lineDetails,
      );

      const user = await this.userService.findById(client.userId);
      const ticket = await this.ticketService.getTicketById(data.ticketId);

      // Notify all players
      this.server.to(`room:${client.currentRoomId}`).emit('game:paused');
      this.server.to(`room:${client.currentRoomId}`).emit('kinh:claimed', {
        userId: client.userId,
        displayName: user.displayName || user.username,
        ticketId: data.ticketId,
        winType: data.winType,
      });

      // Send verification request to room owner
      const room = await this.roomService.findById(client.currentRoomId);
      const ownerSocketId = this.userSockets.get(room.ownerId);
      if (ownerSocketId) {
        this.server.to(ownerSocketId).emit('kinh:verify-request', {
          userId: client.userId,
          displayName: user.displayName || user.username,
          ticketId: data.ticketId,
          ticket: ticket
            ? {
                id: ticket.id,
                ticketNumber: ticket.ticketNumber,
                colorGroup: ticket.colorGroup,
                rows: [ticket.row1, ticket.row2, ticket.row3],
              }
            : null,
          winType: data.winType,
          lineDetails: data.lineDetails,
          calledNumbers: this.gameService.getState(data.sessionId).calledNumbers,
          preValidated,
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Kinh claim failed';
      client.emit('error', { message });
    }
  }

  @SubscribeMessage('kinh:approve')
  async handleKinhApprove(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: number },
  ) {
    if (!client.userId || !client.currentRoomId) return;

    const room = await this.roomService.findById(client.currentRoomId);
    if (room.ownerId !== client.userId) return;

    try {
      const state = this.gameService.getState(data.sessionId);
      const claim = state.currentKinhClaim;
      if (!claim) return;

      const result = await this.gameService.approveKinh(data.sessionId);
      const winner = await this.userService.findById(claim.userId);
      const payments = this.gameService.calculatePayments(
        data.sessionId,
        room.pricePerSheet,
        claim.userId,
      );

      // Send winner announcement to everyone EXCEPT the winner
      const winnerSocketId = this.userSockets.get(claim.userId);

      this.server.to(`room:${client.currentRoomId}`).emit('kinh:winner-announcement', {
        winnerId: claim.userId,
        displayName: winner.displayName || winner.username,
        avatarUrl: winner.avatarUrl,
        qrCodeUrl: winner.qrCodeUrl,
        winType: result.winType,
        ticketId: result.winningTicketId,
      });

      // Send personalized "you won" to winner
      if (winnerSocketId) {
        this.server.to(winnerSocketId).emit('kinh:you-won', {
          winType: result.winType,
          ticketId: result.winningTicketId,
        });
      }

      // Send payment info to each loser
      for (const payment of payments) {
        const socketId = this.userSockets.get(payment.userId);
        if (socketId) {
          this.server.to(socketId).emit('payment:required', {
            amount: payment.amount,
            winnerId: claim.userId,
            winnerDisplayName: winner.displayName || winner.username,
            winnerQrCodeUrl: winner.qrCodeUrl,
          });
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to approve kinh';
      client.emit('error', { message });
    }
  }

  @SubscribeMessage('kinh:reject')
  async handleKinhReject(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: number },
  ) {
    if (!client.userId || !client.currentRoomId) return;

    const room = await this.roomService.findById(client.currentRoomId);
    if (room.ownerId !== client.userId) return;

    try {
      const state = this.gameService.getState(data.sessionId);
      const claim = state.currentKinhClaim;
      if (!claim) return;

      await this.gameService.rejectKinh(data.sessionId);

      // Notify the cheater
      const cheaterSocketId = this.userSockets.get(claim.userId);
      if (cheaterSocketId) {
        this.server.to(cheaterSocketId).emit('kinh:rejected-you', {
          reason: 'Kinh sai - bạn bị phạt!',
        });
      }

      // Notify everyone else
      this.server.to(`room:${client.currentRoomId}`).emit('kinh:rejected', {
        userId: claim.userId,
      });

      // Resume game
      this.server.to(`room:${client.currentRoomId}`).emit('game:resumed');

      // Resume auto-call if applicable
      if (room.callMode === 'auto') {
        this.startAutoCall(data.sessionId, client.currentRoomId, room.autoCallInterval);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to reject kinh';
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

    // Stop any auto-call timers for existing session
    const existing = this.gameService.findSessionForRoom(data.roomId);
    if (existing) {
      this.stopAutoCall(existing.sessionId);
    }

    // Full reset: cleanup old session + create fresh one
    const session = await this.gameService.resetGame(data.roomId);

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

  private findActiveSessionForRoom(roomId: number) {
    return this.gameService.findSessionForRoom(roomId);
  }
}
