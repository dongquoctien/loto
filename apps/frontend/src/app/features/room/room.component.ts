import { Component, OnInit, OnDestroy, signal, computed, inject, HostListener, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SocketService } from '../../core/services/socket.service';
import { AuthService } from '../../core/services/auth.service';
import { AudioService } from '../../core/services/audio.service';
import { checkAllWins, TicketData as SharedTicketData } from '@loto/shared';

import { KinhClaimOverlayItem, KinhVerifyClaimItem, ChallengeParticipant, ChallengeResultPayload } from '@loto/shared';
import { TicketDisplayComponent } from './components/ticket-display/ticket-display.component';
import { SheetSelectorComponent } from './components/sheet-selector/sheet-selector.component';
import { CalledNumbersHeaderComponent } from './components/called-numbers-header/called-numbers-header.component';
import { GameControlsComponent } from './components/game-controls/game-controls.component';
import { KinhButtonComponent } from './components/kinh-button/kinh-button.component';
import { WinnerOverlayComponent, PaymentReportItem } from './components/winner-overlay/winner-overlay.component';
import { PlayerListComponent } from './components/player-list/player-list.component';
import { KinhClaimOverlayComponent } from './components/kinh-claim-overlay/kinh-claim-overlay.component';
import { ChallengeOverlayComponent } from './components/challenge-overlay/challenge-overlay.component';

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
  winCount: number;
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
    KinhClaimOverlayComponent,
    ChallengeOverlayComponent,
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
            @if (myTickets().length > 0 && gameStatus() !== 'preparing' && gameStatus() !== 'finished') {
              <button class="hands-free-toggle" [class.active]="handsFreeMode()" (click)="toggleHandsFree()">
                {{ handsFreeMode() ? '🤖 Rảnh Tay' : '✋ Thủ Công' }}
              </button>
            }
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
                <div class="tickets-header">
                  <h3>Vé Của Bạn</h3>
                  @if (maxColumns() > 1) {
                    <div class="columns-selector">
                      @for (n of columnOptions(); track n) {
                        <button
                          class="col-btn"
                          [class.active]="ticketColumns() === n"
                          (click)="ticketColumns.set(n)">
                          {{ n }}
                        </button>
                      }
                    </div>
                  }
                </div>
                <div class="tickets-grid" [style.grid-template-columns]="'repeat(' + ticketColumns() + ', 1fr)'">
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

            <!-- Owner Verify Tickets (when kinh is claimed) -->
            @if (isOwner() && gameStatus() === 'paused_for_kinh' && verifyClaims().length > 0) {
              @for (vc of verifyClaims(); track vc.userId) {
                <div class="verify-ticket-section">
                  <h3>Vé của {{ vc.displayName }} ({{ vc.winType }}):</h3>
                  <app-ticket-display
                    [ticket]="vc.ticket"  
                    [calledNumbers]="calledNumbers()"
                    [markedCells]="buildVerifyMarkedCells(vc)"
                    [interactive]="false"
                    [winHighlightCells]="buildVerifyWinCells(vc)"
                    (numberLookup)="onNumberLookup($event)">
                  </app-ticket-display>
                </div>
              }
            }

            <!-- Owner Controls -->
            @if (isOwner()) {
              <app-game-controls
                [gameStatus]="gameStatus()"
                [callMode]="room()?.callMode ?? 'auto'"
                [autoCallEnabled]="autoCallEnabled()"
                [autoCallInterval]="room()?.autoCallInterval ?? 5"
                [kinhClaims]="verifyClaims()"
                (startGame)="startGame()"
                (callNumber)="callNumber()"
                (toggleAutoCall)="onToggleAutoCall($event)"
                (approveKinh)="approveKinh($event)"
                (rejectKinh)="rejectKinh($event)"
                (startChallenge)="startChallenge()"
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
            [penalizedPlayers]="penalizedPlayersSet()"
            [nearWinPlayers]="nearWinPlayers()"
            [kinhClaimantIds]="kinhClaimantUserIds()">
          </app-player-list>
        </div>
      }

      <!-- Near-Win Toasts -->
      @if (nearWinToasts().length > 0) {
        <div class="near-win-toast-stack">
          @for (toast of nearWinToasts(); track toast.id) {
            <div class="near-win-toast">
              <div class="near-win-toast-content">
                <span class="near-win-avatar">
                  @if (toast.avatarUrl) {
                    <img [src]="toast.avatarUrl" alt="" />
                  } @else {
                    <span class="near-win-avatar-letter">{{ toast.displayName?.charAt(0)?.toUpperCase() || '?' }}</span>
                  }
                </span>
                <div class="near-win-text">
                  <strong>{{ toast.displayName }}</strong>
                  <span>Đang đợi KINH!</span>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Kinh Claim Overlay (non-owner players) -->
      @if (kinhClaims().length > 0 && !isOwner() && !challengeActive()) {
        <app-kinh-claim-overlay [claims]="kinhClaims()"></app-kinh-claim-overlay>
      }

      <!-- Challenge Overlay -->
      @if (challengeActive()) {
        <app-challenge-overlay
          [cards]="challengeCards()"
          [participants]="challengeParticipants()"
          [myPick]="challengeMyPick()"
          [result]="challengeResult()"
          [isParticipant]="isChallengeParticipant()"
          [timeoutSeconds]="challengeTimeoutSeconds()"
          (cardPicked)="onChallengeCardPicked($event)">
        </app-challenge-overlay>
      }

      <!-- Winner Overlay -->
      @if (winnerInfo()) {
        <app-winner-overlay
          [winner]="winnerInfo()!"
          [paymentAmount]="paymentAmount()"
          [isWinner]="isCurrentUserWinner()"
          [paymentReport]="paymentReport()"
          [totalWinAmount]="totalWinAmount()"
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
    .hands-free-toggle {
      background: #3A3B3C;
      border: 1px solid #4E4F50;
      border-radius: 6px;
      padding: 4px 10px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      color: #B0B3B8;
      font-family: inherit;
      transition: all 0.2s;
    }
    .hands-free-toggle.active {
      background: rgba(0, 164, 0, 0.2);
      border-color: #00A400;
      color: #00A400;
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
    .tickets-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .tickets-header h3 {
      margin: 0;
      font-size: 16px;
      color: #E4E6EB;
    }
    .columns-selector {
      display: flex;
      gap: 4px;
      align-items: center;
    }
    .col-btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: 1px solid #3A3B3C;
      background: #242526;
      color: #B0B3B8;
      font-size: 12px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    .col-btn:hover { background: #3A3B3C; }
    .col-btn.active {
      background: #1877F2;
      border-color: #1877F2;
      color: white;
    }
    .tickets-grid {
      display: grid;
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

    .near-win-toast-stack {
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      width: 90%;
      max-width: 320px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .near-win-toast {
      animation: toastSlideIn 0.3s ease-out, toastFadeOut 0.3s ease-in 2.7s forwards;
    }
    .near-win-toast-content {
      display: flex;
      align-items: center;
      gap: 12px;
      background: linear-gradient(135deg, #1877F2, #0D47A1);
      padding: 12px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(24, 119, 242, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .near-win-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .near-win-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .near-win-avatar-letter { color: white; font-size: 18px; font-weight: 700; }
    .near-win-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      color: white;
    }
    .near-win-text strong { font-size: 14px; }
    .near-win-text span { font-size: 12px; opacity: 0.9; }
    @keyframes toastSlideIn {
      from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes toastFadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    @media (max-width: 768px) {
      .near-win-toast-stack { top: 56px; }
      .room-header {
        padding: 8px 12px;
        flex-wrap: wrap;
        gap: 8px;
      }
      .room-title {
        gap: 6px;
        min-width: 0;
        flex: 1;
      }
      .room-title h2 {
        font-size: 15px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 140px;
      }
      .room-code { font-size: 10px; padding: 1px 6px; }
      .price-badge { font-size: 10px; padding: 1px 6px; }
      .room-actions { gap: 6px; flex-shrink: 0; }
      .hands-free-toggle { padding: 3px 8px; font-size: 11px; }
      .sound-toggle { padding: 3px 6px; font-size: 16px; }
      .leave-btn { padding: 4px 10px; font-size: 12px; white-space: nowrap; }
      .game-area { padding: 10px 12px; }
      .room-body { flex-direction: column; }
    
      :host ::ng-deep .player-sidebar {
        width: 100% !important;
        border-left: none !important;
        border-top: 1px solid #3A3B3C;
        max-height: 200px;
      }
    }
    @media (max-width: 500px) {
      .tickets-grid { grid-template-columns: 1fr !important; }
      .columns-selector { display: none; }
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
  handsFreeMode = signal(false);

  // Near-win (đang đợi) state: userId -> nearWinCount
  nearWinPlayers = signal<Map<number, number>>(new Map());
  nearWinToasts = signal<{ id: number; displayName: string; avatarUrl: string | null }[]>([]);
  private nearWinToastId = 0;

  // Kinh / Winner state (multi-claim)
  kinhClaimantUserIds = signal<number[]>([]);
  kinhClaims = signal<KinhClaimOverlayItem[]>([]);
  verifyClaims = signal<KinhVerifyClaimItem[]>([]);
  highlightCalledNumber = signal<number | null>(null);

  // Challenge state
  challengeActive = signal(false);
  challengeCards = signal<{ picked: boolean; pickedBy: string | null; pickedByAvatar: string | null }[]>([]);
  challengeParticipants = signal<ChallengeParticipant[]>([]);
  challengeMyPick = signal<{ cardIndex: number; value: number } | null>(null);
  challengeResult = signal<ChallengeResultPayload | null>(null);
  challengeTimeoutSeconds = signal(30);
  isChallengeParticipant = computed(() => {
    return this.challengeParticipants().some(p => p.userId === this.currentUserId());
  });
  winnerInfo = signal<{
    displayName: string;
    avatarUrl: string | null;
    qrCodeUrl: string | null;
    winType?: string;
  } | null>(null);
  paymentAmount = signal<number | null>(null);
  isCurrentUserWinner = signal(false);
  paymentReport = signal<PaymentReportItem[]>([]);
  totalWinAmount = signal(0);

  // My purchased tickets
  myTickets = signal<TicketData[]>([]);

  // Ticket grid columns
  ticketColumns = signal(2);
  maxColumns = signal(1);
  columnOptions = computed(() => {
    const max = this.maxColumns();
    return Array.from({ length: max }, (_, i) => i + 1);
  });

  currentUserId = computed(() => this.authService.user()?.id ?? null);
  isOwner = computed(() => {
    const user = this.authService.user();
    const room = this.room();
    return user && room ? user.id === room.ownerId : false;
  });

  constructor() {
    afterNextRender(() => this.updateMaxColumns());
  }

  ngOnInit() {
    this.socketService.connect();
    const roomCode = this.route.snapshot.paramMap.get('code');
    if (roomCode) {
      this.socketService.emit('room:join', { roomCode });
    }
    this.setupSocketListeners();

    // Auto-rejoin room after reconnect (fixes lost connection issues)
    this.socketService.onReconnected$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const code = this.room()?.roomCode || this.route.snapshot.paramMap.get('code');
        if (code) {
          console.log('Reconnected — rejoining room:', code);
          this.socketService.emit('room:join', { roomCode: code });
        }
      });
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

        // Clear stale kinh/challenge state on (re)join
        this.kinhClaimantUserIds.set([]);
        this.kinhClaims.set([]);
        this.verifyClaims.set([]);
        this.challengeActive.set(false);
        this.challengeCards.set([]);
        this.challengeParticipants.set([]);
        this.challengeMyPick.set(null);
        this.challengeResult.set(null);

        if (data.session) {
          this.sessionId.set(data.session.id);
          this.gameStatus.set(data.session.status);
          this.calledNumbers.set(data.session.calledNumbers || []);
          if (data.session.calledNumbers?.length) {
            this.lastCalledNumber.set(data.session.calledNumbers[data.session.calledNumbers.length - 1]);
          }
          // Sync auto-call checkbox when rejoining active game
          if (data.session.status === 'active' && data.room.callMode === 'auto') {
            this.autoCallEnabled.set(true);
          }
        }

        this.audioService.play('join');
      });

    // Player joined
    this.socketService
      .on<{ userId: number; displayName: string; avatarUrl: string | null; winCount?: number }>('room:player-joined')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.players.update((p) => [
          ...p.filter(x => x.userId !== data.userId),
          { userId: data.userId, displayName: data.displayName, avatarUrl: data.avatarUrl, isOnline: true, winCount: data.winCount ?? 0 },
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
        this.markedCells.set(new Set());
        this.nearWinPlayers.set(new Map());
        this.nearWinToasts.set([]);
        this.kinhClaimantUserIds.set([]);
        this.kinhClaims.set([]);
        this.verifyClaims.set([]);
        this.challengeActive.set(false);
        // Sync auto-call checkbox with room's callMode
        this.autoCallEnabled.set(this.room()?.callMode === 'auto');
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

        // Hands-free mode: auto-mark + auto-KINH
        if (this.handsFreeMode()) {
          this.autoMarkNumber(data.number);
        }
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
        this.kinhClaimantUserIds.set([]);
        this.kinhClaims.set([]);
        this.verifyClaims.set([]);
        this.highlightCalledNumber.set(null);
        this.challengeActive.set(false);
        this.challengeCards.set([]);
        this.challengeParticipants.set([]);
        this.challengeMyPick.set(null);
        this.challengeResult.set(null);
      });

    // Kinh claims updated (multi-claim)
    this.socketService
      .on<{ claims: KinhClaimOverlayItem[] }>('kinh:claims-updated')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.kinhClaims.set(data.claims);
        this.kinhClaimantUserIds.set(data.claims.map(c => c.userId));
        this.audioService.play('kinh');
      });

    // Kinh verify request (owner only) — array of claims
    this.socketService
      .on<{ claims: KinhVerifyClaimItem[] }>('kinh:verify-request')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.verifyClaims.set(data.claims);
      });

    // Winner announcement
    this.socketService
      .on<{
        winnerId: number;
        displayName: string;
        avatarUrl: string | null;
        qrCodeUrl: string | null;
        winType?: string;
        paymentReport?: PaymentReportItem[];
        totalWinAmount?: number;
      }>('kinh:winner-announcement')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.gameStatus.set('finished');
        this.kinhClaims.set([]);
        this.kinhClaimantUserIds.set([]);
        this.challengeActive.set(false);
        this.challengeResult.set(null);
        this.winnerInfo.set({
          displayName: data.displayName,
          avatarUrl: data.avatarUrl,
          qrCodeUrl: data.qrCodeUrl,
          winType: data.winType,
        });
        this.isCurrentUserWinner.set(data.winnerId === this.currentUserId());
        this.paymentReport.set(data.paymentReport || []);
        this.totalWinAmount.set(data.totalWinAmount || 0);
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

    // Player near-win (đang đợi KINH)
    this.socketService
      .on<{ userId: number; displayName: string; avatarUrl: string | null; nearWinCount: number }>('player:near-win')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        const prevCount = this.nearWinPlayers().get(data.userId) || 0;
        const newCount = data.nearWinCount || 1;

        // Update nearWinPlayers map (userId -> count)
        this.nearWinPlayers.update((m) => {
          const newMap = new Map(m);
          newMap.set(data.userId, newCount);
          return newMap;
        });

        // Show toast and play sound when count increases (new near-win lines detected)
        if (newCount > prevCount) {
          const toastId = ++this.nearWinToastId;
          this.nearWinToasts.update((arr) => [...arr, { id: toastId, displayName: data.displayName, avatarUrl: data.avatarUrl }]);
          this.audioService.play('near-win');
          setTimeout(() => this.nearWinToasts.update((arr) => arr.filter((t) => t.id !== toastId)), 3000);
        }
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
        this.nearWinPlayers.set(new Map());
        this.nearWinToasts.set([]);
        this.winnerInfo.set(null);
        this.paymentAmount.set(null);
        this.markedCells.set(new Set());
        this.winHighlightCells.set(new Set());
        this.myTickets.set([]);
        this.takenSheets.set(new Map());
        this.kinhClaimantUserIds.set([]);
        this.kinhClaims.set([]);
        this.verifyClaims.set([]);
        this.highlightCalledNumber.set(null);
        this.autoCallEnabled.set(false);
        this.challengeActive.set(false);
        this.challengeCards.set([]);
        this.challengeParticipants.set([]);
        this.challengeMyPick.set(null);
        this.challengeResult.set(null);
      });

    // Challenge started
    this.socketService
      .on<{ participants: ChallengeParticipant[]; cardCount: number; timeoutSeconds: number }>('challenge:started')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.challengeActive.set(true);
        this.challengeParticipants.set(data.participants);
        this.challengeTimeoutSeconds.set(data.timeoutSeconds);
        this.challengeMyPick.set(null);
        this.challengeResult.set(null);
        this.challengeCards.set(
          Array.from({ length: data.cardCount }, () => ({ picked: false, pickedBy: null, pickedByAvatar: null }))
        );
        // Hide kinh overlay when challenge starts
        this.kinhClaims.set([]);
      });

    // Challenge card picked by someone
    this.socketService
      .on<{ cardIndex: number; userId: number; displayName: string }>('challenge:card-picked')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        const participant = this.challengeParticipants().find(p => p.userId === data.userId);
        this.challengeCards.update((cards) => {
          const updated = [...cards];
          updated[data.cardIndex] = { picked: true, pickedBy: data.displayName, pickedByAvatar: participant?.avatarUrl ?? null };
          return updated;
        });
      });

    // Challenge your pick (value revealed to you)
    this.socketService
      .on<{ cardIndex: number; value: number }>('challenge:your-pick')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.challengeMyPick.set({ cardIndex: data.cardIndex, value: data.value });
      });

    // Challenge result
    this.socketService
      .on<ChallengeResultPayload>('challenge:result')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.challengeResult.set(data);
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

  approveKinh(userId: number) {
    const sid = this.sessionId();
    if (sid) {
      this.socketService.emit('kinh:approve', { sessionId: sid, userId });
    }
  }

  rejectKinh(userId: number) {
    const sid = this.sessionId();
    if (sid) {
      this.socketService.emit('kinh:reject', { sessionId: sid, userId });
    }
  }

  startChallenge() {
    const sid = this.sessionId();
    if (sid) {
      this.socketService.emit('kinh:start-challenge', { sessionId: sid });
    }
  }

  onChallengeCardPicked(cardIndex: number) {
    const sid = this.sessionId();
    if (sid) {
      this.socketService.emit('challenge:pick-card', { sessionId: sid, cardIndex });
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

  toggleHandsFree() {
    this.handsFreeMode.update((v) => !v);
  }

  /**
   * Hands-free: auto-mark all cells matching the called number across all owned tickets.
   * After marking, check for a win and auto-claim KINH.
   */
  private autoMarkNumber(calledNumber: number) {
    const sid = this.sessionId();
    if (!sid) return;

    const tickets = this.myTickets();
    let anyMarked = false;

    for (const ticket of tickets) {
      for (let r = 0; r < ticket.rows.length; r++) {
        for (let c = 0; c < ticket.rows[r].length; c++) {
          const num = ticket.rows[r][c];
          if (num !== calledNumber) continue;

          const key = `${ticket.id}:${r}:${c}`;
          if (this.markedCells().has(key)) continue;

          // Mark this cell
          this.socketService.emit('ticket:mark-cell', {
            sessionId: sid,
            ticketId: ticket.id,
            row: r,
            col: c,
            number: calledNumber,
          });
          this.markedCells.update((s) => {
            const newSet = new Set(s);
            newSet.add(key);
            return newSet;
          });
          anyMarked = true;
        }
      }
    }

    if (anyMarked) {
      this.audioService.play('mark');
    }

    // After auto-marking, check for auto-KINH
    this.checkAutoKinh();
  }

  /**
   * Hands-free: check if any ticket now has a win condition and auto-claim KINH.
   */
  private checkAutoKinh() {
    if (this.isPenalized()) return;
    if (this.gameStatus() !== 'active') return;

    const room = this.room();
    if (!room) return;

    const enabledTypes = {
      horizontal: room.winHorizontal,
      vertical: room.winVertical,
      diagonal: room.winDiagonal,
    };

    const calledSet = new Set(this.calledNumbers());
    const marked = this.markedCells();

    for (const ticket of this.myTickets()) {
      // Build the effective (called ∩ marked) set, same logic as KinhButtonComponent
      const effectiveSet = new Set<number>();
      for (let r = 0; r < ticket.rows.length; r++) {
        for (let c = 0; c < ticket.rows[r].length; c++) {
          const num = ticket.rows[r][c];
          if (num === null || num === 0) continue;
          const key = `${ticket.id}:${r}:${c}`;
          if (calledSet.has(num) && marked.has(key)) {
            effectiveSet.add(num);
          }
        }
      }

      const sharedTicket: SharedTicketData = {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        colorGroup: ticket.colorGroup as SharedTicketData['colorGroup'],
        rows: ticket.rows as SharedTicketData['rows'],
      };

      const result = checkAllWins(sharedTicket, effectiveSet, enabledTypes);
      if (result.hasWin && result.wins.length > 0) {
        const firstWin = result.wins[0];
        this.onKinhClaimed({
          ticketId: ticket.id,
          winType: firstWin.winType,
          lineDetails: firstWin.lineDetails,
        });
        return; // Only claim once
      }
    }
  }

  buildVerifyMarkedCells(vc: KinhVerifyClaimItem): Set<string> {
    const marked = new Set<string>();
    if (!vc.ticket) return marked;
    const calledSet = new Set(this.calledNumbers());
    vc.ticket.rows.forEach((row: (number | null)[], ri: number) => {
      row.forEach((cell: number | null, ci: number) => {
        if (cell !== null && calledSet.has(cell)) {
          marked.add(`${vc.ticket.id}:${ri}:${ci}`);
        }
      });
    });
    return marked;
  }

  buildVerifyWinCells(vc: KinhVerifyClaimItem): Set<string> {
    const winCells = new Set<string>();
    if (!vc.ticket || !vc.lineDetails) return winCells;
    const ld = vc.lineDetails;
    const ticket = vc.ticket;

    if (vc.winType === 'horizontal' && ld.rowIndex !== undefined) {
      const row = ticket.rows[ld.rowIndex];
      if (row) {
        row.forEach((cell: number | null, ci: number) => {
          if (cell !== null) {
            winCells.add(`${ticket.id}:${ld.rowIndex}:${ci}`);
          }
        });
      }
    } else if (vc.winType === 'vertical' && ld.colIndex !== undefined) {
      ticket.rows.forEach((row: (number | null)[], ri: number) => {
        if (row && row[ld.colIndex!] !== null) {
          winCells.add(`${ticket.id}:${ri}:${ld.colIndex}`);
        }
      });
    } else if (vc.winType === 'diagonal') {
      const startCol = ld.startCol ?? 0;
      const isMain = ld.direction === 'main';
      ticket.rows.forEach((row: (number | null)[], r: number) => {
        const c = isMain ? startCol + r : startCol - r;
        if (c >= 0 && c < (row?.length ?? 0) && row[c] !== null) {
          winCells.add(`${ticket.id}:${r}:${c}`);
        }
      });
    }
    return winCells;
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

  @HostListener('window:resize')
  onWindowResize() {
    this.updateMaxColumns();
  }

  private updateMaxColumns() {
    const width = window.innerWidth;
    if (width <= 500) {
      this.maxColumns.set(1);
      this.ticketColumns.set(1);
      return;
    }
    // Subtract sidebar (~200px) + padding (~40px) for game area width
    const gameAreaWidth = width > 768 ? width - 240 : width - 40;
    const max = Math.max(1, Math.floor(gameAreaWidth / 250));
    this.maxColumns.set(max);
    if (this.ticketColumns() > max) {
      this.ticketColumns.set(max);
    }
  }

  dismissWinner() {
    this.winnerInfo.set(null);
    this.isCurrentUserWinner.set(false);
    this.paymentReport.set([]);
    this.totalWinAmount.set(0);
  }
}
