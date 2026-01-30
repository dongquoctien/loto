import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SocketService } from '../../core/services/socket.service';
import { AuthService } from '../../core/services/auth.service';
import { AudioService } from '../../core/services/audio.service';

import { TicketDisplayComponent } from './components/ticket-display/ticket-display.component';
import { SheetSelectorComponent } from './components/sheet-selector/sheet-selector.component';
import { CalledNumbersHeaderComponent } from './components/called-numbers-header/called-numbers-header.component';
import { GameControlsComponent } from './components/game-controls/game-controls.component';
import { KinhButtonComponent } from './components/kinh-button/kinh-button.component';
import { WinnerOverlayComponent } from './components/winner-overlay/winner-overlay.component';
import { PlayerListComponent } from './components/player-list/player-list.component';

interface RoomData {
  id: number;
  roomCode: string;
  name: string;
  ownerId: number;
  callMode: string;
  autoCallInterval: number;
  pricePerSheet: number;
  winHorizontal: boolean;
  winVertical: boolean;
  winDiagonal: boolean;
  status: string;
}

interface Player {
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
}

interface TicketData {
  id: number;
  ticketNumber: number;
  colorGroup: string;
  rows: (number | null)[][];
}

interface SheetInfo {
  id: number;
  sheetNumber: number;
  colorGroup: string;
  tickets: TicketData[];
}

@Component({
  selector: 'app-room',
  standalone: true,
  imports: [
    CommonModule,
    TicketDisplayComponent,
    SheetSelectorComponent,
    CalledNumbersHeaderComponent,
    GameControlsComponent,
    KinhButtonComponent,
    WinnerOverlayComponent,
    PlayerListComponent,
  ],
  template: `
    <div class="room-container">
      @if (!room()) {
        <div class="loading">
          <div class="spinner"></div>
          <p>Đang kết nối phòng...</p>
        </div>
      } @else {
        <!-- Header -->
        <header class="room-header">
          <div class="room-title">
            <h2>{{ room()?.name }}</h2>
            <span class="room-code">{{ room()?.roomCode }}</span>
            <span class="price-badge">{{ room()?.pricePerSheet | number:'1.0-0' }}đ/tờ</span>
          </div>
          <div class="room-actions">
            <button class="sound-toggle" (click)="toggleSound()">
              {{ soundEnabled() ? '🔊' : '🔇' }}
            </button>
            <button class="leave-btn" (click)="leaveRoom()">Rời Phòng</button>
          </div>
        </header>

        <!-- Called Numbers -->
        @if (sessionId()) {
          <app-called-numbers-header
            [calledNumbers]="calledNumbers()"
            [lastCalled]="lastCalledNumber()"
            [highlightNumber]="highlightCalledNumber()">
          </app-called-numbers-header>
        }

        <!-- Main Body -->
        <div class="room-body">
          <!-- Game Area -->
          <div class="game-area">
            <!-- Sheet Selector -->
            @if (gameStatus() === 'preparing') {
              <app-sheet-selector
                [sheets]="availableSheets()"
                [takenSheets]="takenSheets()"
                [players]="players()"
                [currentUserId]="currentUserId()"
                [canPurchase]="!!sessionId()"
                (sheetSelected)="purchaseSheet($event)">
              </app-sheet-selector>
            }

            <!-- My Tickets -->
            @if (myTickets().length > 0) {
              <div class="my-tickets">
                <h3>Vé Của Bạn</h3>
                <div class="tickets-grid">
                  @for (ticket of myTickets(); track ticket.id) {
                    <app-ticket-display
                      [ticket]="ticket"
                      [calledNumbers]="calledNumbers()"
                      [markedCells]="markedCells()"
                      [interactive]="gameStatus() === 'active'"
                      [winHighlightCells]="winHighlightCells()"
                      (cellClicked)="onCellClicked($event)">
                    </app-ticket-display>
                  }
                </div>
              </div>
            }

            <!-- Kinh Button -->
            @if (gameStatus() === 'active' && !isPenalized() && myTickets().length > 0) {
              <app-kinh-button
                [ownedTickets]="myTickets()"
                [calledNumbers]="calledNumbers()"
                [markedCells]="markedCells()"
                [winHorizontal]="room()?.winHorizontal ?? true"
                [winVertical]="room()?.winVertical ?? false"
                [winDiagonal]="room()?.winDiagonal ?? false"
                (kinhClaimed)="onKinhClaimed($event)">
              </app-kinh-button>
            }

            @if (isPenalized()) {
              <div class="penalty-notice">
                ⚠️ Bạn đã bị phạt vì hô Kinh sai. Bạn sẽ phải trả tiền khi có người thắng.
              </div>
            }

            <!-- Owner Verify Ticket (when kinh is claimed) -->
            @if (isOwner() && gameStatus() === 'paused_for_kinh' && verifyTicket()) {
              <div class="verify-ticket-section">
                <h3>Kiểm tra vé của người hô Kinh:</h3>
                <app-ticket-display
                  [ticket]="verifyTicket()!"
                  [calledNumbers]="calledNumbers()"
                  [markedCells]="verifyMarkedCells()"
                  [interactive]="false"
                  [winHighlightCells]="verifyWinCells()"
                  (numberLookup)="onNumberLookup($event)">
                </app-ticket-display>
              </div>
            }

            <!-- Owner Controls -->
            @if (isOwner()) {
              <app-game-controls
                [gameStatus]="gameStatus()"
                [callMode]="room()?.callMode ?? 'auto'"
                [autoCallEnabled]="autoCallEnabled()"
                [autoCallInterval]="room()?.autoCallInterval ?? 5"
                [kinhClaimant]="kinhClaimant()"
                (startGame)="startGame()"
                (callNumber)="callNumber()"
                (toggleAutoCall)="onToggleAutoCall($event)"
                (approveKinh)="approveKinh()"
                (rejectKinh)="rejectKinh()"
                (resetGame)="resetGame()"
                (pauseGame)="pauseGame()"
                (resumeGame)="resumeGame()">
              </app-game-controls>
            }

            @if (gameStatus() === 'paused' && !isOwner()) {
              <div class="pause-notice">
                ⏸ Game đang tạm dừng. Đợi chủ phòng tiếp tục...
              </div>
            }

            @if (!sessionId() && !isOwner()) {
              <div class="waiting-message">
                <p>Đợi chủ phòng bắt đầu game...</p>
              </div>
            }
          </div>

          <!-- Player List -->
          <app-player-list
            [players]="players()"
            [ownerId]="room()?.ownerId ?? null"
            [currentUserId]="currentUserId()"
            [penalizedPlayers]="penalizedPlayersSet()">
          </app-player-list>
        </div>
      }

      <!-- Winner Overlay -->
      @if (winnerInfo()) {
        <app-winner-overlay
          [winner]="winnerInfo()!"
          [paymentAmount]="paymentAmount()"
          (dismissed)="dismissWinner()">
        </app-winner-overlay>
      }
    </div>
  `,
  styles: [`
    .room-container {
      min-height: 100vh;
      background: #18191A;
      color: #E4E6EB;
      display: flex;
      flex-direction: column;
    }
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      gap: 16px;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #3A3B3C;
      border-top-color: #1877F2;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading p { color: #B0B3B8; }

    .room-header {
      background: #242526;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #3A3B3C;
    }
    .room-title {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .room-title h2 { margin: 0; font-size: 18px; color: #E4E6EB; }
    .room-code {
      background: #1877F2;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      color: white;
    }
    .price-badge {
      background: #00A400;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      color: white;
    }
    .room-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .sound-toggle {
      background: none;
      border: 1px solid #3A3B3C;
      border-radius: 6px;
      padding: 4px 8px;
      cursor: pointer;
      font-size: 18px;
    }
    .leave-btn {
      background: #FA383E;
      border: none;
      color: white;
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-family: inherit;
      transition: background 0.2s;
    }
    .leave-btn:hover { background: #E5343A; }
    .room-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    .game-area {
      flex: 1;
      padding: 16px 20px;
      overflow-y: auto;
    }
    .my-tickets h3 {
      margin: 0 0 12px;
      font-size: 16px;
      color: #E4E6EB;
    }
    .tickets-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 12px;
    }
    .penalty-notice {
      background: rgba(250, 56, 62, 0.15);
      border: 1px solid #FA383E;
      border-radius: 8px;
      padding: 12px 16px;
      color: #FF6B6B;
      margin: 12px 0;
      font-size: 14px;
    }
    .verify-ticket-section {
      background: rgba(255, 215, 0, 0.1);
      border: 2px solid #FFD700;
      border-radius: 12px;
      padding: 16px;
      margin: 16px 0;
    }
    .verify-ticket-section h3 {
      margin: 0 0 12px;
      color: #FFD700;
      font-size: 15px;
    }
    .pause-notice {
      background: rgba(243, 156, 18, 0.15);
      border: 1px solid #f39c12;
      border-radius: 8px;
      padding: 12px 16px;
      color: #ffd966;
      margin: 12px 0;
      font-size: 14px;
      text-align: center;
    }
    .waiting-message {
      text-align: center;
      padding: 60px 20px;
      color: #B0B3B8;
    }
    .waiting-message p { font-size: 16px; }

    @media (max-width: 768px) {
      .room-body { flex-direction: column; }
      .tickets-grid { grid-template-columns: 1fr; }
      :host ::ng-deep .player-sidebar {
        width: 100% !important;
        border-left: none !important;
        border-top: 1px solid #3A3B3C;
        max-height: 200px;
      }
    }
  `],
})
export class RoomComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private socketService = inject(SocketService);
  private authService = inject(AuthService);
  private audioService = inject(AudioService);

  // Room state
  room = signal<RoomData | null>(null);
  players = signal<Player[]>([]);
  availableSheets = signal<SheetInfo[]>([]);
  takenSheets = signal<Map<number, number>>(new Map());
  sessionId = signal<number | null>(null);

  // Game state
  calledNumbers = signal<number[]>([]);
  lastCalledNumber = signal<number | null>(null);
  gameStatus = signal<string>('preparing');
  autoCallEnabled = signal(false);
  isPenalized = signal(false);
  penalizedPlayersSet = signal<Set<number>>(new Set());
  markedCells = signal<Set<string>>(new Set());
  winHighlightCells = signal<Set<string>>(new Set());
  soundEnabled = signal(true);

  // Kinh / Winner state
  kinhClaimant = signal<{ displayName: string; winType: string } | null>(null);
  verifyTicket = signal<TicketData | null>(null);
  verifyMarkedCells = signal<Set<string>>(new Set());
  verifyWinCells = signal<Set<string>>(new Set());
  highlightCalledNumber = signal<number | null>(null);
  winnerInfo = signal<{
    displayName: string;
    avatarUrl: string | null;
    qrCodeUrl: string | null;
    winType?: string;
  } | null>(null);
  paymentAmount = signal<number | null>(null);

  // My purchased tickets
  myTickets = signal<TicketData[]>([]);

  currentUserId = computed(() => this.authService.user()?.id ?? null);
  isOwner = computed(() => {
    const user = this.authService.user();
    const room = this.room();
    return user && room ? user.id === room.ownerId : false;
  });

  ngOnInit() {
    this.socketService.connect();
    const roomCode = this.route.snapshot.paramMap.get('code');
    if (roomCode) {
      this.socketService.emit('room:join', { roomCode });
    }
    this.setupSocketListeners();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    const room = this.room();
    if (room) {
      this.socketService.emit('room:leave', { roomId: room.id });
    }
  }

  private setupSocketListeners() {
    // Room joined
    this.socketService
      .on<{ room: RoomData; players: Player[]; sheets: SheetInfo[]; session?: { id: number; status: string; calledNumbers: number[] }; purchasedSheets?: Record<string, number> }>('room:joined')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.room.set(data.room);
        this.players.set(data.players);
        this.availableSheets.set(data.sheets);

        if (data.purchasedSheets) {
          const map = new Map<number, number>();
          for (const [k, v] of Object.entries(data.purchasedSheets)) {
            map.set(Number(k), v);
          }
          this.takenSheets.set(map);
          this.extractMyTickets(data.sheets, map);
        }

        if (data.session) {
          this.sessionId.set(data.session.id);
          this.gameStatus.set(data.session.status);
          this.calledNumbers.set(data.session.calledNumbers || []);
          if (data.session.calledNumbers?.length) {
            this.lastCalledNumber.set(data.session.calledNumbers[data.session.calledNumbers.length - 1]);
          }
        }

        this.audioService.play('join');
      });

    // Player joined
    this.socketService
      .on<{ userId: number; displayName: string; avatarUrl: string | null }>('room:player-joined')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.players.update((p) => [
          ...p.filter(x => x.userId !== data.userId),
          { userId: data.userId, displayName: data.displayName, avatarUrl: data.avatarUrl, isOnline: true },
        ]);
        this.audioService.play('join');
      });

    // Player left / disconnected
    this.socketService
      .on<{ userId: number }>('room:player-left')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.players.update((p) =>
          p.map(x => x.userId === data.userId ? { ...x, isOnline: false } : x)
        );
      });

    // Sheet taken
    this.socketService
      .on<{ sheetId: number; userId: number; tickets: TicketData[] }>('sheet:taken')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.takenSheets.update((m) => {
          const newMap = new Map(m);
          newMap.set(data.sheetId, data.userId);
          return newMap;
        });

        if (data.userId === this.currentUserId()) {
          this.myTickets.update((t) => [...t, ...data.tickets]);
        }
      });

    // Game started
    this.socketService
      .on<{ sessionId: number; sessionNumber: number }>('game:started')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.sessionId.set(data.sessionId);
        this.gameStatus.set('active');
        this.calledNumbers.set([]);
        this.lastCalledNumber.set(null);
        this.audioService.play('start');
      });

    // Number called
    this.socketService
      .on<{ number: number; calledNumbers: number[] }>('game:number-called')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.calledNumbers.set(data.calledNumbers);
        this.lastCalledNumber.set(data.number);
        this.audioService.play('number-called');
      });

    // All numbers called (all 90 numbers exhausted)
    this.socketService
      .on<void>('game:all-numbers-called')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.gameStatus.set('finished');
      });

    // Game paused (kinh claim or owner manual pause)
    this.socketService
      .on<{ reason?: string }>('game:paused')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data?.reason === 'owner') {
          this.gameStatus.set('paused');
        } else {
          this.gameStatus.set('paused_for_kinh');
        }
      });

    // Game resumed (kinh rejected or owner manual resume)
    this.socketService
      .on<{ reason?: string }>('game:resumed')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.gameStatus.set('active');
        this.kinhClaimant.set(null);
        this.verifyTicket.set(null);
        this.highlightCalledNumber.set(null);
      });

    // Kinh claimed
    this.socketService
      .on<{ userId: number; displayName: string; winType: string }>('kinh:claimed')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.kinhClaimant.set({ displayName: data.displayName, winType: data.winType });
        this.audioService.play('kinh');
      });

    // Kinh verify request (owner only)
    this.socketService
      .on<{
        userId: number;
        displayName: string;
        ticketId: number;
        ticket: TicketData;
        winType: string;
        lineDetails: any;
        calledNumbers: number[];
        preValidated: boolean;
      }>('kinh:verify-request')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.verifyTicket.set(data.ticket);

        // Build marked cells from called numbers that appear on the ticket
        const marked = new Set<string>();
        if (data.ticket && data.calledNumbers) {
          const calledSet = new Set(data.calledNumbers);
          data.ticket.rows.forEach((row, ri) => {
            row.forEach((cell, ci) => {
              if (cell !== null && calledSet.has(cell)) {
                marked.add(`${data.ticket.id}:${ri}:${ci}`);
              }
            });
          });
        }
        this.verifyMarkedCells.set(marked);

        // Build win highlight cells from lineDetails
        const winCells = new Set<string>();
        if (data.lineDetails && data.ticket) {
          if (data.lineDetails.rowIndex !== undefined) {
            // Horizontal win - highlight all non-null cells in the row
            const row = data.ticket.rows[data.lineDetails.rowIndex];
            if (row) {
              row.forEach((cell, ci) => {
                if (cell !== null) {
                  winCells.add(`${data.ticket.id}:${data.lineDetails.rowIndex}:${ci}`);
                }
              });
            }
          }
        }
        this.verifyWinCells.set(winCells);

        // Update kinhClaimant with preValidated info
        this.kinhClaimant.set({
          displayName: data.displayName,
          winType: `${data.winType}${data.preValidated ? ' ✓' : ' ✗'}`,
        });
      });

    // Winner announcement
    this.socketService
      .on<{
        winnerId: number;
        displayName: string;
        avatarUrl: string | null;
        qrCodeUrl: string | null;
        winType?: string;
      }>('kinh:winner-announcement')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.gameStatus.set('finished');
        this.winnerInfo.set({
          displayName: data.displayName,
          avatarUrl: data.avatarUrl,
          qrCodeUrl: data.qrCodeUrl,
          winType: data.winType,
        });
        this.audioService.play('winner');
      });

    // You won
    this.socketService
      .on<{ message: string }>('kinh:you-won')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.gameStatus.set('finished');
        this.audioService.play('winner');
      });

    // Payment required
    this.socketService
      .on<{ amount: number }>('payment:required')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.paymentAmount.set(data.amount);
      });

    // Rejected
    this.socketService
      .on<{ reason: string }>('kinh:rejected-you')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.isPenalized.set(true);
        this.penalizedPlayersSet.update((s) => {
          const newSet = new Set(s);
          newSet.add(this.currentUserId()!);
          return newSet;
        });
        this.audioService.play('error');
      });

    // Kinh rejected (others)
    this.socketService
      .on<{ userId: number }>('kinh:rejected')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.penalizedPlayersSet.update((s) => {
          const newSet = new Set(s);
          newSet.add(data.userId);
          return newSet;
        });
      });

    // Game reset
    this.socketService
      .on<{ sessionId: number; sessionNumber: number }>('game:reset')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.sessionId.set(data.sessionId);
        this.gameStatus.set('preparing');
        this.calledNumbers.set([]);
        this.lastCalledNumber.set(null);
        this.isPenalized.set(false);
        this.penalizedPlayersSet.set(new Set());
        this.winnerInfo.set(null);
        this.paymentAmount.set(null);
        this.markedCells.set(new Set());
        this.winHighlightCells.set(new Set());
        this.myTickets.set([]);
        this.takenSheets.set(new Map());
        this.kinhClaimant.set(null);
        this.verifyTicket.set(null);
        this.highlightCalledNumber.set(null);
        this.autoCallEnabled.set(false);
      });

    // Room dissolved (owner left)
    this.socketService
      .on<{ reason: string }>('room:dissolved')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        alert(data.reason);
        this.router.navigate(['/lobby']);
      });

    // Error
    this.socketService
      .on<{ message: string }>('error')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        console.error('Socket error:', data.message);
        this.audioService.play('error');
      });
  }

  private extractMyTickets(sheets: SheetInfo[], takenMap: Map<number, number>) {
    const userId = this.currentUserId();
    if (!userId) return;

    const myTicketsList: TicketData[] = [];
    for (const sheet of sheets) {
      if (takenMap.get(sheet.id) === userId) {
        myTicketsList.push(...sheet.tickets);
      }
    }
    this.myTickets.set(myTicketsList);
  }

  // Actions
  purchaseSheet(sheet: SheetInfo) {
    const sid = this.sessionId();
    if (!sid) return;
    this.socketService.emit('sheet:purchase', { sessionId: sid, sheetId: sheet.id });
  }

  onNumberLookup(num: number) {
    this.highlightCalledNumber.set(num);
  }

  onCellClicked(event: { ticketId: number; rowIndex: number; colIndex: number; number: number }) {
    const sid = this.sessionId();
    if (!sid) return;

    const key = `${event.ticketId}:${event.rowIndex}:${event.colIndex}`;
    const isMarked = this.markedCells().has(key);

    if (isMarked) {
      this.socketService.emit('ticket:unmark-cell', {
        sessionId: sid,
        ticketId: event.ticketId,
        row: event.rowIndex,
        col: event.colIndex,
      });
      this.markedCells.update((s) => {
        const newSet = new Set(s);
        newSet.delete(key);
        return newSet;
      });
    } else {
      this.socketService.emit('ticket:mark-cell', {
        sessionId: sid,
        ticketId: event.ticketId,
        row: event.rowIndex,
        col: event.colIndex,
        number: event.number,
      });
      this.markedCells.update((s) => {
        const newSet = new Set(s);
        newSet.add(key);
        return newSet;
      });
      this.audioService.play('mark');
    }
  }

  onKinhClaimed(event: { ticketId: number; winType: string; lineDetails: any }) {
    const sid = this.sessionId();
    if (!sid) return;
    this.socketService.emit('kinh:claim', {
      sessionId: sid,
      ticketId: event.ticketId,
      winType: event.winType,
      lineDetails: event.lineDetails,
    });
  }

  startGame() {
    const room = this.room();
    if (room) {
      this.socketService.emit('game:start', { roomId: room.id });
    }
  }

  callNumber() {
    const sid = this.sessionId();
    if (sid) {
      this.socketService.emit('game:call-number', { sessionId: sid });
    }
  }

  onToggleAutoCall(enabled: boolean) {
    const sid = this.sessionId();
    if (sid) {
      this.autoCallEnabled.set(enabled);
      this.socketService.emit('game:toggle-auto-call', { sessionId: sid, enabled });
    }
  }

  approveKinh() {
    const sid = this.sessionId();
    if (sid) {
      this.socketService.emit('kinh:approve', { sessionId: sid });
    }
  }

  rejectKinh() {
    const sid = this.sessionId();
    if (sid) {
      this.socketService.emit('kinh:reject', { sessionId: sid });
    }
  }

  pauseGame() {
    const sid = this.sessionId();
    if (sid) {
      this.socketService.emit('game:pause', { sessionId: sid });
    }
  }

  resumeGame() {
    const sid = this.sessionId();
    if (sid) {
      this.socketService.emit('game:resume', { sessionId: sid });
    }
  }

  resetGame() {
    const room = this.room();
    if (room) {
      this.socketService.emit('game:reset', { roomId: room.id });
    }
  }

  leaveRoom() {
    const room = this.room();
    if (room) {
      this.socketService.emit('room:leave', { roomId: room.id });
    }
    this.router.navigate(['/lobby']);
  }

  toggleSound() {
    this.soundEnabled.set(this.audioService.toggle());
  }

  dismissWinner() {
    this.winnerInfo.set(null);
  }
}
