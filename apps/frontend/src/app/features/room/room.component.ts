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
        <!-- Sticky Top Area -->
        <div class="sticky-top">
          <!-- Header -->
          <header class="room-header">
            <div class="room-title">
              <h2>{{ room()?.name }}</h2>
              <span class="room-code" (click)="copyRoomCode()" title="Bấm để sao chép">
                {{ room()?.roomCode }}
                @if (copiedRoomCode()) {
                  <span class="copied-tooltip">Copied!</span>
                }
              </span>
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
              <button class="leave-btn" (click)="leaveRoom()" [disabled]="isGameInProgress()">Rời Phòng</button>
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
        </div>

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

            <!-- Kinh Button (desktop inline) -->
            @if (gameStatus() === 'active' && !isPenalized() && myTickets().length > 0) {
              <div class="inline-kinh">
                <app-kinh-button
                  [ownedTickets]="myTickets()"
                  [calledNumbers]="calledNumbers()"
                  [markedCells]="markedCells()"
                  [winHorizontal]="room()?.winHorizontal ?? true"
                  [winVertical]="room()?.winVertical ?? false"
                  [winDiagonal]="room()?.winDiagonal ?? false"
                  (kinhClaimed)="onKinhClaimed($event)">
                </app-kinh-button>
              </div>
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
                  <h3>Vé của {{ vc.displayName }} ({{ getWinTypeLabel(vc.winType) }}):</h3>
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

            <!-- Owner Controls (desktop inline) -->
            @if (isOwner()) {
              <div class="inline-controls">
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
              </div>
            }

            @if (gameStatus() === 'paused' && !isOwner()) {
              <div class="pause-notice">
                ⏸ Game đang tạm dừng. Đợi chủ phòng tiếp tục...
              </div>
            }

            <!-- Idle / status states for non-owners -->
            @if (!isOwner()) {
              @if (!sessionId()) {
                <div class="idle-state">
                  <div class="idle-icon">🎲</div>
                  <h3 class="idle-title">Sẵn Sàng Chơi</h3>
                  <p class="idle-text">Đợi chủ phòng bắt đầu ván mới...</p>
                  <div class="idle-hint">Khi ván bắt đầu, bạn sẽ chọn tờ vé và tham gia ngay!</div>
                </div>
              } @else if (gameStatus() === 'finished') {
                @if (myTickets().length === 0) {
                  <div class="idle-state">
                    <div class="idle-icon">🏁</div>
                    <h3 class="idle-title">Ván Đã Kết Thúc</h3>
                    <p class="idle-text">Đợi chủ phòng bắt đầu ván mới...</p>
                    <div class="idle-hint">Vui lòng chờ trong giây lát, ván mới sẽ bắt đầu sớm thôi!</div>
                  </div>
                } @else {
                  <div class="finished-banner">
                    🏁 Ván đã kết thúc — Đợi chủ phòng bắt đầu ván mới...
                  </div>
                }
              } @else if (gameStatus() !== 'preparing' && myTickets().length === 0) {
                <div class="idle-state">
                  <div class="idle-icon">👀</div>
                  <h3 class="idle-title">Đang Theo Dõi</h3>
                  <p class="idle-text">Ván đang diễn ra, bạn chưa có vé.</p>
                  <div class="idle-hint">Hãy đợi ván tiếp theo để mua vé và tham gia nhé!</div>
                </div>
              }
            }
          </div>

          <!-- Player List (desktop only) -->
          <div class="desktop-player-list">
            <app-player-list
              [players]="players()"
              [ownerId]="room()?.ownerId ?? null"
              [currentUserId]="currentUserId()"
              [penalizedPlayers]="penalizedPlayersSet()"
              [nearWinPlayers]="nearWinPlayers()"
              [kinhClaimantIds]="kinhClaimantUserIds()">
            </app-player-list>
          </div>
        </div>

        <!-- Mobile Bottom Bar -->
        <div class="mobile-bottom-bar">
          <button class="bar-btn" (click)="openSheet('players')">
            <span class="bar-icon">👥</span>
            <span class="bar-label">{{ players().length }}</span>
          </button>
          @if (gameStatus() === 'active' && !isPenalized() && myTickets().length > 0) {
            <div class="bar-kinh">
              <app-kinh-button
                [ownedTickets]="myTickets()"
                [calledNumbers]="calledNumbers()"
                [markedCells]="markedCells()"
                [winHorizontal]="room()?.winHorizontal ?? true"
                [winVertical]="room()?.winVertical ?? false"
                [winDiagonal]="room()?.winDiagonal ?? false"
                (kinhClaimed)="onKinhClaimed($event)">
              </app-kinh-button>
            </div>
          }
          @if (isOwner()) {
            <button class="bar-btn" (click)="openSheet('controls')">
              <span class="bar-icon">⚙️</span>
              <span class="bar-label">Quản lý</span>
            </button>
          }
        </div>

        <!-- Player Sheet (mobile) -->
        <div class="sheet-backdrop" [class.open]="showPlayerSheet()" (click)="showPlayerSheet.set(false)">
          <div class="sheet-panel" (click)="$event.stopPropagation()">
            <div class="sheet-handle"></div>
            <app-player-list
              [players]="players()"
              [ownerId]="room()?.ownerId ?? null"
              [currentUserId]="currentUserId()"
              [penalizedPlayers]="penalizedPlayersSet()"
              [nearWinPlayers]="nearWinPlayers()"
              [kinhClaimantIds]="kinhClaimantUserIds()">
            </app-player-list>
          </div>
        </div>

        <!-- Controls Sheet (mobile, owner only) -->
        @if (isOwner()) {
          <div class="sheet-backdrop" [class.open]="showControlsSheet()" (click)="showControlsSheet.set(false)">
            <div class="sheet-panel" (click)="$event.stopPropagation()">
              <div class="sheet-handle"></div>
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
            </div>
          </div>
        }
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
                <span class="near-win-count-sticker">
                  <span class="sticker-x">x</span>{{ toast.nearWinCount }}
                </span>
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

      <!-- Kinh Alert Popup (owner only) -->
      @if (showKinhAlert()) {
        <div class="kinh-alert-backdrop" (click)="dismissKinhAlert()">
          <div class="kinh-alert-popup" (click)="$event.stopPropagation()">
            <div class="kinh-alert-icon">🔔</div>
            <h3 class="kinh-alert-title">Có người Hô KINH!</h3>
            <div class="kinh-alert-names">
              @for (name of kinhAlertClaimants(); track name) {
                <span class="kinh-alert-name">{{ name }}</span>
              }
            </div>
            <p class="kinh-alert-desc">Vui lòng kiểm tra và xác nhận bên dưới.</p>
            <button class="kinh-alert-btn" (click)="scrollToVerify()">Xác Nhận & Xem Vé</button>
          </div>
        </div>
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
      height: 100vh;
      background: #18191A;
      color: #E4E6EB;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }
    .loading {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; height: 100vh; gap: 16px;
    }
    .spinner {
      width: 40px; height: 40px; border: 3px solid #3A3B3C;
      border-top-color: #1877F2; border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading p { color: #B0B3B8; }

    .sticky-top {
      position: sticky; top: 0; z-index: 100;
    }
    .room-header {
      background: #242526; padding: 12px 20px; display: flex;
      align-items: center; justify-content: space-between; border-bottom: 1px solid #3A3B3C;
    }
    .room-title { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .room-title h2 { margin: 0; font-size: 18px; color: #E4E6EB; }
    .room-code {
      background: #1877F2; padding: 2px 8px; border-radius: 4px; font-size: 12px;
      font-weight: 600; color: white; cursor: pointer; position: relative; user-select: none;
    }
    .room-code:active { background: #1565C0; }
    .copied-tooltip {
      position: absolute; top: -28px; left: 50%; transform: translateX(-50%);
      background: #00A400; color: white; padding: 2px 8px; border-radius: 4px;
      font-size: 10px; white-space: nowrap; animation: tooltipFade 1.5s ease-out forwards; pointer-events: none;
    }
    @keyframes tooltipFade {
      0% { opacity: 1; transform: translateX(-50%); }
      70% { opacity: 1; transform: translateX(-50%) translateY(-4px); }
      100% { opacity: 0; transform: translateX(-50%) translateY(-8px); }
    }
    .price-badge { background: #00A400; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; color: white; }
    .room-actions { display: flex; gap: 8px; align-items: center; }
    .hands-free-toggle {
      background: #3A3B3C; border: 1px solid #4E4F50; border-radius: 6px;
      padding: 4px 10px; cursor: pointer; font-size: 12px; font-weight: 600;
      color: #B0B3B8; font-family: inherit;
    }
    .hands-free-toggle.active { background: rgba(0,164,0,0.2); border-color: #00A400; color: #00A400; }
    .sound-toggle { background: none; border: 1px solid #3A3B3C; border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 18px; }
    .leave-btn {
      background: #FA383E; border: none; color: white; padding: 6px 14px;
      border-radius: 6px; cursor: pointer; font-size: 13px; font-family: inherit;
    }
    .leave-btn:hover:not(:disabled) { background: #E5343A; }
    .leave-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .room-body { display: flex; flex: 1; }
    .game-area { flex: 1; padding: 16px 20px; }
    .tickets-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .tickets-header h3 { margin: 0; font-size: 16px; }
    .columns-selector { display: flex; gap: 4px; align-items: center; }
    .col-btn {
      width: 28px; height: 28px; border-radius: 6px; border: 1px solid #3A3B3C;
      background: #242526; color: #B0B3B8; font-size: 12px; font-weight: 600;
      font-family: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center;
    }
    .col-btn:hover { background: #3A3B3C; }
    .col-btn.active { background: #1877F2; border-color: #1877F2; color: white; }
    .tickets-grid { display: grid; gap: 12px; }
    .penalty-notice {
      background: rgba(250,56,62,0.15); border: 1px solid #FA383E;
      border-radius: 8px; padding: 12px 16px; color: #FF6B6B; margin: 12px 0; font-size: 14px;
    }
    .verify-ticket-section {
      background: rgba(255,215,0,0.1); border: 2px solid #FFD700;
      border-radius: 12px; padding: 16px; margin: 16px 0;
    }
    .verify-ticket-section h3 { margin: 0 0 12px; color: #FFD700; font-size: 15px; }
    .pause-notice {
      background: rgba(243,156,18,0.15); border: 1px solid #f39c12;
      border-radius: 8px; padding: 12px 16px; color: #ffd966; margin: 12px 0; font-size: 14px; text-align: center;
    }
    .idle-state {
      text-align: center;
      padding: 48px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .idle-icon { font-size: 48px; animation: idlePulse 2.5s ease-in-out infinite; }
    @keyframes idlePulse {
      0%, 100% { transform: scale(1); opacity: 0.9; }
      50% { transform: scale(1.08); opacity: 1; }
    }
    .idle-title { margin: 0; font-size: 18px; font-weight: 600; }
    .idle-text { margin: 0; font-size: 15px; color: #B0B3B8; }
    .idle-hint { margin-top: 8px; font-size: 13px; color: #65676B; max-width: 280px; line-height: 1.4; }
    .finished-banner {
      background: rgba(100,100,100,0.15);
      border: 1px solid #3A3B3C;
      border-radius: 8px;
      padding: 12px 16px;
      color: #B0B3B8;
      margin: 12px 0;
      font-size: 14px;
      text-align: center;
    }

    /* Kinh Alert Popup */
    .kinh-alert-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.7);
      z-index: 500; display: flex; align-items: center; justify-content: center;
      animation: kinhAlertFadeIn 0.2s ease-out;
    }
    @keyframes kinhAlertFadeIn { from { opacity: 0; } to { opacity: 1; } }
    .kinh-alert-popup {
      background: #242526; border: 2px solid #FFD700; border-radius: 16px;
      padding: 28px 32px; text-align: center; max-width: 360px; width: 90%;
      box-shadow: 0 8px 40px rgba(255,215,0,0.3);
      animation: kinhAlertPop 0.3s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes kinhAlertPop {
      0% { transform: scale(0.8); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    .kinh-alert-icon { font-size: 48px; margin-bottom: 8px; animation: kinhBell 0.5s ease-in-out 0.2s; }
    @keyframes kinhBell {
      0%, 100% { transform: rotate(0); }
      20% { transform: rotate(15deg); }
      40% { transform: rotate(-15deg); }
      60% { transform: rotate(10deg); }
      80% { transform: rotate(-10deg); }
    }
    .kinh-alert-title { margin: 0 0 12px; font-size: 20px; color: #FFD700; font-weight: 700; }
    .kinh-alert-names { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-bottom: 12px; }
    .kinh-alert-name {
      background: rgba(255,215,0,0.15); border: 1px solid #FFD700; color: #FFD700;
      padding: 3px 10px; border-radius: 20px; font-size: 13px; font-weight: 600;
    }
    .kinh-alert-desc { color: #B0B3B8; font-size: 14px; margin: 0 0 16px; }
    .kinh-alert-btn {
      background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; border: none;
      padding: 10px 28px; border-radius: 8px; font-size: 15px; font-weight: 700;
      cursor: pointer; font-family: inherit; transition: transform 0.15s;
    }
    .kinh-alert-btn:hover { transform: scale(1.04); }
    .kinh-alert-btn:active { transform: scale(0.97); }

    .near-win-toast-stack {
      position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
      z-index: 1000; width: 90%; max-width: 320px;
      display: flex; flex-direction: column; gap: 8px;
    }
    .near-win-toast { animation: toastSlideIn 0.3s ease-out, toastFadeOut 0.3s ease-in 2.7s forwards; }
    .near-win-toast-content {
      display: flex; align-items: center; gap: 12px;
      background: linear-gradient(135deg, #1877F2, #0D47A1);
      padding: 12px 20px; border-radius: 12px;
      box-shadow: 0 8px 32px rgba(24,119,242,0.4);
      border: 1px solid rgba(255,255,255,0.15);
    }
    .near-win-avatar {
      width: 40px; height: 40px; border-radius: 50%; overflow: hidden; flex-shrink: 0;
      background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center;
    }
    .near-win-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .near-win-avatar-letter { color: white; font-size: 18px; font-weight: 700; }
    .near-win-text { display: flex; flex-direction: column; gap: 2px; color: white; }
    .near-win-text strong { font-size: 14px; }
    .near-win-text span { font-size: 12px; opacity: 0.9; }
    .near-win-count-sticker {
      font-size: 28px; font-weight: 900; font-style: italic; color: #FFD700;
      text-shadow: -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 0 8px rgba(255,215,0,0.6), 0 0 16px rgba(255,165,0,0.3);
      line-height: 1; flex-shrink: 0; margin-left: auto;
      transform: rotate(-8deg); animation: stickerPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards;
    }
    .sticker-x {
      font-size: 18px; color: #FFF;
      text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
      margin-right: 1px;
    }
    @keyframes stickerPop {
      0% { transform: rotate(-8deg) scale(0); }
      60% { transform: rotate(-8deg) scale(1.3); }
      100% { transform: rotate(-8deg) scale(1); }
    }
    @keyframes toastSlideIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; } }
    @keyframes toastFadeOut { from { opacity: 1; } to { opacity: 0; } }

    /* Bottom Sheet shared styles */
    .sheet-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      z-index: 200; opacity: 0; pointer-events: none; transition: opacity 0.3s; display: none;
    }
    .sheet-backdrop.open { opacity: 1; pointer-events: auto; }
    .sheet-panel {
      position: absolute; bottom: 0; left: 0; right: 0;
      background: #242526; border-radius: 16px 16px 0 0;
      max-height: 70vh; overflow-y: auto;
      transform: translateY(100%); transition: transform 0.3s ease-out;
      padding: 12px 16px calc(24px + 68px);
    }
    .sheet-backdrop.open .sheet-panel { transform: translateY(0); }
    .sheet-handle { width: 36px; height: 4px; background: #65676B; border-radius: 2px; margin: 0 auto 12px; }
    .sheet-title { font-size: 16px; font-weight: 700; color: #E4E6EB; margin-bottom: 12px; text-align: center; }

    /* Mobile Bottom Bar */
    .mobile-bottom-bar {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 250;
      background: #242526; border-top: 1px solid #3A3B3C;
      display: none; align-items: stretch; padding: 6px 10px; gap: 8px;
      padding-bottom: max(6px, env(safe-area-inset-bottom));
    }
    .bar-btn {
      flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 3px; background: #3A3B3C; border: none; border-radius: 12px;
      padding: 8px 6px; cursor: pointer; font-family: inherit; min-height: 48px;
    }
    .bar-btn:active { background: #4E4F50; }
    .bar-icon { font-size: 18px; line-height: 1; }
    .bar-label { font-size: 11px; color: #B0B3B8; font-weight: 600; }
    .bar-kinh { flex: 2; display: flex; align-items: stretch; min-height: 48px; }
    .bar-kinh ::ng-deep app-kinh-button { display: flex; width: 100%; }
    .bar-kinh ::ng-deep .kinh-wrapper { width: 100%; display: flex; align-items: stretch; }
    .bar-kinh ::ng-deep .kinh-main-btn {
      padding: 0 6px !important; font-size: 15px !important; letter-spacing: 3px !important;
      width: 100%; border-radius: 12px !important; box-shadow: 0 2px 10px rgba(233,69,96,0.4) !important;
    }
    .bar-kinh ::ng-deep .kinh-main-btn:hover:not(:disabled) { transform: none !important; }
    .bar-kinh ::ng-deep .win-detected-info, .bar-kinh ::ng-deep .no-win-hint { display: none !important; }

    /* Desktop: hide mobile elements */
    .desktop-player-list { display: contents; }

    @media (max-width: 768px) {
      .near-win-toast-stack { top: 56px; }
      .room-header { padding: 8px 12px; flex-wrap: wrap; gap: 8px; }
      .room-title { gap: 6px; min-width: 0; flex: 1; }
      .room-title h2 { font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }
      .room-code, .price-badge { font-size: 10px; padding: 1px 6px; }
      .room-actions { gap: 6px; flex-shrink: 0; }
      .hands-free-toggle { padding: 3px 8px; font-size: 11px; }
      .sound-toggle { padding: 3px 6px; font-size: 16px; }
      .leave-btn { padding: 4px 10px; font-size: 12px; white-space: nowrap; }
      .game-area { padding: 10px 12px; }
      .room-body { flex-direction: column; }
      .my-tickets { margin-bottom: 8px; }
      .tickets-header h3 { font-size: 14px; }
      .desktop-player-list, .inline-kinh, .inline-controls { display: none; }
      .mobile-bottom-bar { display: flex; }
      .sheet-backdrop { display: block; }
      .room-container { padding-bottom: 68px; }
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

  // UI state (mobile)
  copiedRoomCode = signal(false);
  showPlayerSheet = signal(false);
  showControlsSheet = signal(false);

  // Kinh alert popup for owner
  showKinhAlert = signal(false);
  kinhAlertClaimants = signal<string[]>([]);

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
  nearWinToasts = signal<{ id: number; displayName: string; avatarUrl: string | null; nearWinCount: number }[]>([]);
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
  isGameInProgress = computed(() => {
    const status = this.gameStatus();
    const playing = status === 'active' || status === 'paused' || status === 'paused_for_kinh';
    // Only block leaving if user has purchased tickets (is actually playing)
    return playing && this.myTickets().length > 0;
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

  getWinTypeLabel(type: string): string {
    switch (type) {
      case 'horizontal': return 'Hàng ngang';
      case 'vertical': return 'Hàng dọc';
      case 'diagonal': return 'Đường chéo';
      default: return type;
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
        this.showKinhAlert.set(false);
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

    // Player left the room — remove from player list
    this.socketService
      .on<{ userId: number }>('room:player-left')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.players.update((p) => p.filter(x => x.userId !== data.userId));
      });

    // Sheets released (when a player leaves, their purchased sheets become available)
    this.socketService
      .on<{ sheetIds: number[]; userId: number }>('sheet:released')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.takenSheets.update((m) => {
          const newMap = new Map(m);
          for (const sheetId of data.sheetIds) {
            newMap.delete(sheetId);
          }
          return newMap;
        });
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
        this.showKinhAlert.set(false);
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
        // Show alert popup for owner
        if (this.isOwner() && data.claims.length > 0) {
          this.kinhAlertClaimants.set(data.claims.map(c => c.displayName));
          this.showKinhAlert.set(true);
          this.audioService.play('kinh');
        }
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
        this.showKinhAlert.set(false);
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
          this.nearWinToasts.update((arr) => [...arr, { id: toastId, displayName: data.displayName, avatarUrl: data.avatarUrl, nearWinCount: newCount }]);
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

  copyRoomCode() {
    const code = this.room()?.roomCode;
    if (code) {
      navigator.clipboard.writeText(code);
      this.copiedRoomCode.set(true);
      setTimeout(() => this.copiedRoomCode.set(false), 1500);
    }
  }

  openSheet(sheet: 'players' | 'controls') {
    if (sheet === 'players') {
      this.showControlsSheet.set(false);
      this.showPlayerSheet.set(!this.showPlayerSheet());
    } else {
      this.showPlayerSheet.set(false);
      this.showControlsSheet.set(!this.showControlsSheet());
    }
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

  dismissKinhAlert() {
    this.showKinhAlert.set(false);
  }

  scrollToVerify() {
    this.showKinhAlert.set(false);
    setTimeout(() => {
      const el = document.querySelector('.verify-ticket-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  leaveRoom() {
    if (this.isGameInProgress()) return;
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
    if (width <= 768) {
      // Mobile: single column for tickets
      this.maxColumns.set(1);
      this.ticketColumns.set(1);
      return;
    }
    // Desktop: subtract sidebar (~200px) + padding (~40px) for game area width
    const gameAreaWidth = width - 240;
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
