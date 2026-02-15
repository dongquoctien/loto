import { Component, OnInit, OnDestroy, signal, computed, inject, HostListener, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  iconoirSoundHigh,
  iconoirSoundOff,
  iconoirLock,
  iconoirAppleImac2021,
  iconoirEditPencil,
  iconoirGroup,
  iconoirWarningTriangle,
  iconoirDiceFive,
  iconoirGoogleHome,
  iconoirEye,
  iconoirCheck,
  iconoirSettings,
  iconoirBell,
  iconoirPause,
  iconoirFlash,
  iconoirStatsUpSquare,
  iconoirLogOut,
} from '@ng-icons/iconoir';
import { SocketService } from '../../core/services/socket.service';
import { AuthService } from '../../core/services/auth.service';
import { AudioService } from '../../core/services/audio.service';
import { YoutubePlayerService } from '../../core/services/youtube-player.service';
import { ChatService } from '../../core/services/chat.service';
import { ReportService } from '../../core/services/report.service';
import { checkAllWins, TicketData as SharedTicketData } from '@loto/shared';
import { environment } from '../../../environments/environment';

import { KinhClaimOverlayItem, KinhVerifyClaimItem, ChallengeParticipant, ChallengeResultPayload } from '@loto/shared';
import { TicketDisplayComponent } from './components/ticket-display/ticket-display.component';
import { SheetDisplayComponent } from './components/sheet-display/sheet-display.component';
import { SheetSelectorComponent } from './components/sheet-selector/sheet-selector.component';
import { CalledNumbersHeaderComponent } from './components/called-numbers-header/called-numbers-header.component';
import { GameControlsComponent } from './components/game-controls/game-controls.component';
import { KinhButtonComponent } from './components/kinh-button/kinh-button.component';
import { WinnerOverlayComponent, PaymentReportItem } from './components/winner-overlay/winner-overlay.component';
import { PlayerListComponent } from './components/player-list/player-list.component';
import { KinhClaimOverlayComponent } from './components/kinh-claim-overlay/kinh-claim-overlay.component';
import { ChallengeOverlayComponent } from './components/challenge-overlay/challenge-overlay.component';
import { ReportDialogComponent } from './components/report-dialog/report-dialog.component';

interface RoomData {
  id: number;
  roomCode: string;
  name: string;
  ownerId: number;
  callMode: string;
  callVoice: string;
  autoCallInterval: number;
  pricePerSheet: number;
  winHorizontal: boolean;
  winVertical: boolean;
  winDiagonal: boolean;
  allowHandsFree: boolean;
  backgroundMusicUrl: string | null;
  status: string;
}

interface Player {
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
  isReady: boolean;
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
    FormsModule,
    NgIcon,
    TicketDisplayComponent,
    SheetDisplayComponent,
    SheetSelectorComponent,
    CalledNumbersHeaderComponent,
    GameControlsComponent,
    KinhButtonComponent,
    WinnerOverlayComponent,
    PlayerListComponent,
    KinhClaimOverlayComponent,
    ChallengeOverlayComponent,
    ReportDialogComponent,
  ],
  viewProviders: [
    provideIcons({
      iconoirSoundHigh,
      iconoirSoundOff,
      iconoirLock,
      iconoirAppleImac2021,
      iconoirEditPencil,
      iconoirGroup,
      iconoirWarningTriangle,
      iconoirDiceFive,
      iconoirGoogleHome,
      iconoirEye,
      iconoirCheck,
      iconoirSettings,
      iconoirBell,
      iconoirPause,
      iconoirFlash,
      iconoirStatsUpSquare,
      iconoirLogOut,
    }),
  ],
  template: `
    <div class="room-container">
      <!-- Password Dialog -->
      @if (showPasswordDialog()) {
        <div class="password-dialog-backdrop">
          <div class="password-dialog">
            <h3><ng-icon name="iconoirLock" class="dialog-icon"></ng-icon> Phòng Yêu Cầu Mật Khẩu</h3>
            <p>Nhập mật khẩu để vào phòng</p>
            <input
              type="password"
              [(ngModel)]="roomPassword"
              placeholder="Mật khẩu"
              (keyup.enter)="submitPassword()"
              autocomplete="new-password"
              autofocus
            />
            @if (passwordError()) {
              <p class="password-error">{{ passwordError() }}</p>
            }
            <div class="password-dialog-actions">
              <button class="btn-cancel" (click)="cancelPasswordDialog()">Hủy</button>
              <button class="btn-submit" (click)="submitPassword()" [disabled]="!roomPassword">Vào Phòng</button>
            </div>
          </div>
        </div>
      }

      @if (!room() && !showPasswordDialog()) {
        <div class="loading">
          <div class="spinner"></div>
          <p>Đang kết nối phòng...</p>
        </div>
      } @else if (room()) {
        <!-- Audio Suspended Banner -->
        @if (audioSuspended() && soundEnabled()) {
          <div class="audio-suspended-banner" (click)="resumeAudio()">
            <ng-icon name="iconoirSoundOff" class="banner-icon"></ng-icon>
            <span>Âm thanh bị tạm dừng. Chạm để bật lại.</span>
          </div>
        }

        <!-- Sticky Top Area -->
        <div class="sticky-top">
          <!-- Header -->
          <header class="room-header" [class.playing-mode]="gameStatus() !== 'preparing' && gameStatus() !== 'finished'">
            <div class="room-title">
              <h2>{{ room()?.name }}</h2>
              <span class="room-code" (click)="copyRoomCode()" title="Bấm để sao chép">
                {{ room()?.roomCode }}
                @if (copiedRoomCode()) {
                  <span class="copied-tooltip">Copied!</span>
                }
              </span>
              <span class="price-badge">{{ room()?.pricePerSheet | number:'1.0-0' }}đ/tờ</span>
              @if (totalKinhPrize() > 0) {
                <span class="kinh-prize-badge">🏆 {{ totalKinhPrize() | number:'1.0-0' }}đ</span>
              }
            </div>
            <div class="room-actions">
              @if (room()?.allowHandsFree && myTickets().length > 0 && gameStatus() !== 'preparing' && gameStatus() !== 'finished') {
                <button class="hands-free-toggle" [class.active]="handsFreeMode()" (click)="toggleHandsFree()">
                  @if (handsFreeMode()) {
                    <ng-icon name="iconoirAppleImac2021" class="toggle-icon"></ng-icon> Rảnh Tay
                  } @else {
                    <ng-icon name="iconoirEditPencil" class="toggle-icon"></ng-icon> Thủ Công
                  }
                </button>
              }
              @if (room()?.backgroundMusicUrl && youtubePlayerService.isLoaded() && gameStatus() === 'preparing') {
                <button class="music-toggle" [class.muted]="bgMusicMuted()" (click)="toggleBgMusic()" title="Nhạc nền">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="music-icon">
                    <circle cx="6" cy="18" r="3"/>
                    <path d="M9 18V5l8-3v13"/>
                    <circle cx="17" cy="15" r="3"/>
                    @if (bgMusicMuted()) {
                      <line x1="2" y1="2" x2="22" y2="22" stroke-width="2.5"/>
                    } @else {
                      <path d="M21 9c1 1 1 3 0 4" opacity="0.6"/>
                      <path d="M23 7c2 2 2 6 0 8" opacity="0.4"/>
                    }
                  </svg>
                </button>
              }
              @if (gameStatus() !== 'preparing' && gameStatus() !== 'finished') {
                <button class="sound-toggle" (click)="toggleSound()" title="Âm thanh game">
                  <ng-icon [name]="soundEnabled() ? 'iconoirSoundHigh' : 'iconoirSoundOff'"></ng-icon>
                </button>
              }
              <button class="report-btn" (click)="openReportDialog()" title="Báo cáo thống kê">
                <ng-icon name="iconoirStatsUpSquare"></ng-icon>
                <span class="btn-text">Thống kê</span>
              </button>
              <button class="leave-btn" (click)="showLeaveConfirm()" [disabled]="isGameInProgress()" title="Rời phòng">
                <ng-icon name="iconoirLogOut"></ng-icon>
                <span class="btn-text">Rời Phòng</span>
              </button>
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
                (sheetSelected)="purchaseSheet($event)"
                (sheetReturned)="returnSheet($event)">
              </app-sheet-selector>

            }

            <!-- My Sheets (grouped tickets) -->
            @if (mySheets().length > 0) {
              <div class="my-sheets">
                <!-- <div class="sheets-header">
                  <h3>Tờ Của Bạn</h3>
                </div> -->
                <div class="sheets-grid" [class.single-sheet]="mySheets().length === 1" [class.two-sheets]="mySheets().length === 2">
                  @for (sheet of mySheets(); track sheet.id) {
                    <app-sheet-display
                      [sheet]="sheet"
                      [ownerName]="ownerDisplayName()"
                      [calledNumbers]="calledNumbers()"
                      [markedCells]="markedCells()"
                      [interactive]="gameStatus() === 'active'"
                      [winHighlightCells]="winHighlightCells()"
                      (cellClicked)="onCellClicked($event)">
                    </app-sheet-display>
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
                <ng-icon name="iconoirWarningTriangle" class="penalty-icon"></ng-icon> Bạn đã bị phạt vì hô Kinh sai. Bạn sẽ phải trả tiền khi có người thắng.
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

            @if (gameStatus() === 'paused' && !isOwner()) {
              <div class="pause-notice">
                <ng-icon name="iconoirPause" class="pause-icon"></ng-icon> Game đang tạm dừng. Đợi chủ phòng tiếp tục...
              </div>
            }

            <!-- Idle / status states for non-owners -->
            @if (!isOwner()) {
              @if (!sessionId()) {
                <div class="idle-state">
                  <ng-icon name="iconoirDiceFive" class="idle-icon"></ng-icon>
                  <h3 class="idle-title">Sẵn Sàng Chơi</h3>
                  <p class="idle-text">Đợi chủ phòng bắt đầu ván mới...</p>
                  <div class="idle-hint">Khi ván bắt đầu, bạn sẽ chọn tờ vé và tham gia ngay!</div>
                </div>
              } @else if (gameStatus() === 'finished') {
                @if (myTickets().length === 0) {
                  <div class="idle-state">
                    <ng-icon name="iconoirGoogleHome" class="idle-icon"></ng-icon>
                    <h3 class="idle-title">Ván Đã Kết Thúc</h3>
                    <p class="idle-text">Đợi chủ phòng bắt đầu ván mới...</p>
                    <div class="idle-hint">Vui lòng chờ trong giây lát, ván mới sẽ bắt đầu sớm thôi!</div>
                  </div>
                } @else {
                  <div class="finished-banner">
                    <ng-icon name="iconoirGoogleHome" class="finished-icon"></ng-icon> Ván đã kết thúc — Đợi chủ phòng bắt đầu ván mới...
                  </div>
                }
              } @else if (gameStatus() !== 'preparing' && myTickets().length === 0) {
                <div class="idle-state">
                  <ng-icon name="iconoirEye" class="idle-icon"></ng-icon>
                  <h3 class="idle-title">Đang Theo Dõi</h3>
                  <p class="idle-text">Ván đang diễn ra, bạn chưa có vé.</p>
                  <div class="idle-hint">Hãy đợi ván tiếp theo để mua vé và tham gia nhé!</div>
                </div>
              }
            }
          </div>

          <!-- Desktop Sidebar (Controls + Ready + Player List) -->
          <div class="desktop-sidebar">
            <!-- Owner Controls -->
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

            <!-- Ready Button for non-owner players (desktop sidebar) -->
            @if (gameStatus() === 'preparing' && !isOwner() && myTickets().length > 0) {
              <div class="sidebar-ready-section">
                <button
                  class="sidebar-ready-btn"
                  [class.is-ready]="isCurrentUserReady()"
                  (click)="toggleReady()">
                  @if (isCurrentUserReady()) {
                    <ng-icon name="iconoirCheck" class="ready-icon"></ng-icon>
                    <span class="ready-text">ĐÃ SẴN SÀNG</span>
                  } @else {
                    <ng-icon name="iconoirFlash" class="ready-icon"></ng-icon>
                    <span class="ready-text">SẴN SÀNG</span>
                  }
                </button>
              </div>
            }

            <!-- Player List -->
            <div class="desktop-player-list">
              <app-player-list
                [players]="playersWithSheetCounts()"
                [ownerId]="room()?.ownerId ?? null"
                [currentUserId]="currentUserId()"
                [penalizedPlayers]="penalizedPlayersSet()"
                [nearWinPlayers]="nearWinPlayers()"
                [kinhClaimantIds]="kinhClaimantUserIds()"
                [roomStatus]="gameStatus() === 'preparing' ? 'waiting' : 'playing'">
              </app-player-list>
            </div>
          </div>
        </div>

        <!-- Mobile Bottom Bar -->
        <div class="mobile-bottom-bar">
          <button class="bar-btn" (click)="openSheet('players')">
            <ng-icon name="iconoirGroup" class="bar-icon"></ng-icon>
            <span class="bar-label">{{ players().length }}</span>
            @if (chatService.hasUnread()) {
              <span class="unread-badge">{{ chatService.unreadCount() > 99 ? '99+' : chatService.unreadCount() }}</span>
            }
          </button>
          @if (gameStatus() === 'preparing' && !isOwner() && myTickets().length > 0) {
            <button
              class="bar-ready-btn"
              [class.is-ready]="isCurrentUserReady()"
              (click)="toggleReady()">
              @if (isCurrentUserReady()) {
                <ng-icon name="iconoirCheck" class="bar-ready-icon"></ng-icon>
                <span class="bar-ready-text">ĐÃ SẴN SÀNG</span>
              } @else {
                <ng-icon name="iconoirFlash" class="bar-ready-icon"></ng-icon>
                <span class="bar-ready-text">SẴN SÀNG</span>
              }
            </button>
          }
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
              <ng-icon name="iconoirSettings" class="bar-icon"></ng-icon>
              <span class="bar-label">Quản lý</span>
            </button>
          }
        </div>

        <!-- Player Sheet (mobile) -->
        <div class="sheet-backdrop" [class.open]="showPlayerSheet()" (click)="closePlayerSheet()">
          <div class="sheet-panel" (click)="$event.stopPropagation()">
            <div class="sheet-handle"></div>
            <app-player-list
              [players]="playersWithSheetCounts()"
              [ownerId]="room()?.ownerId ?? null"
              [currentUserId]="currentUserId()"
              [penalizedPlayers]="penalizedPlayersSet()"
              [nearWinPlayers]="nearWinPlayers()"
              [kinhClaimantIds]="kinhClaimantUserIds()"
              [roomStatus]="gameStatus() === 'preparing' ? 'waiting' : 'playing'"
              [isSheetOpen]="showPlayerSheet()">
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
            <ng-icon name="iconoirBell" class="kinh-alert-icon"></ng-icon>
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

      <!-- Report Dialog -->
      @if (showReportDialog()) {
        <app-report-dialog (close)="closeReportDialog()"></app-report-dialog>
      }

      <!-- Leave Confirmation Dialog -->
      <!-- Room Not Found Popup -->
      @if (showRoomNotFoundPopup()) {
        <div class="leave-dialog-backdrop">
          <div class="leave-dialog">
            <ng-icon name="iconoirWarningTriangle" class="leave-dialog-icon"></ng-icon>
            <h3>Phòng Không Tồn Tại</h3>
            <p>Phòng này đã bị xóa hoặc không tồn tại.</p>
            <div class="leave-dialog-actions">
              <button class="btn-leave" (click)="onRoomNotFoundOk()">OK</button>
            </div>
          </div>
        </div>
      }

      <!-- Leave Confirmation Dialog -->
      @if (showLeaveDialog()) {
        <div class="leave-dialog-backdrop" (click)="cancelLeaveDialog()">
          <div class="leave-dialog" (click)="$event.stopPropagation()">
            <ng-icon name="iconoirLogOut" class="leave-dialog-icon"></ng-icon>
            <h3>Rời Phòng?</h3>
            <p>Bạn có chắc chắn muốn rời khỏi phòng này không?</p>
            <div class="leave-dialog-actions">
              <button class="btn-cancel" (click)="cancelLeaveDialog()">Ở Lại</button>
              <button class="btn-leave" (click)="confirmLeaveRoom()">Rời Phòng</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .room-container {
      min-height: 100vh;
      min-height: 100dvh; /* iOS dynamic viewport height */
      background: #18191A;
      color: #E4E6EB;
      display: flex;
      flex-direction: column;
      /* Removed overflow-y: auto - iOS Safari needs native scroll for sticky to work */
    }
    /* Password Dialog */
    .password-dialog-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.8);
      z-index: 1000; display: flex; align-items: center; justify-content: center;
    }
    .password-dialog {
      background: #242526; border-radius: 16px; padding: 24px 32px;
      max-width: 360px; width: 90%; text-align: center;
      box-shadow: 0 8px 40px rgba(0,0,0,0.4);
    }
    .password-dialog h3 { margin: 0 0 8px; font-size: 20px; color: #E4E6EB; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .dialog-icon { font-size: 34px; }
    .password-dialog p { margin: 0 0 16px; color: #B0B3B8; font-size: 14px; }
    .password-dialog input {
      width: 100%; padding: 12px; border: 1px solid #3A3B3C;
      border-radius: 8px; background: #3A3B3C; color: #E4E6EB;
      font-size: 16px; text-align: center; box-sizing: border-box;
    }
    .password-dialog input:focus { outline: none; border-color: #1877F2; }
    .password-error { color: #FA383E; font-size: 13px; margin: 8px 0 0; }
    .password-dialog-actions { display: flex; gap: 12px; margin-top: 20px; }
    .password-dialog-actions button {
      flex: 1; padding: 10px 16px; border-radius: 8px; font-size: 15px;
      font-weight: 600; cursor: pointer; font-family: inherit; border: none;
    }
    .btn-cancel { background: #3A3B3C; color: #E4E6EB; }
    .btn-cancel:hover { background: #4E4F50; }
    .btn-submit { background: #1877F2; color: white; }
    .btn-submit:hover:not(:disabled) { background: #166FE5; }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Leave Confirmation Dialog */
    .leave-dialog-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.8);
      z-index: 1000; display: flex; align-items: center; justify-content: center;
    }
    .leave-dialog {
      background: #242526; border-radius: 16px; padding: 24px 32px;
      max-width: 360px; width: 90%; text-align: center;
      box-shadow: 0 8px 40px rgba(0,0,0,0.4);
      animation: leaveDialogPop 0.2s ease-out;
    }
    @keyframes leaveDialogPop {
      0% { transform: scale(0.9); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    .leave-dialog-icon { font-size: 48px; color: #FA383E; margin-bottom: 8px; }
    .leave-dialog h3 { margin: 0 0 8px; font-size: 20px; color: #E4E6EB; }
    .leave-dialog p { margin: 0 0 20px; color: #B0B3B8; font-size: 14px; }
    .leave-dialog-actions { display: flex; gap: 12px; }
    .leave-dialog-actions button {
      flex: 1; padding: 10px 16px; border-radius: 8px; font-size: 15px;
      font-weight: 600; cursor: pointer; font-family: inherit; border: none;
    }
    .leave-dialog .btn-cancel { background: #3A3B3C; color: #E4E6EB; }
    .leave-dialog .btn-cancel:hover { background: #4E4F50; }
    .leave-dialog .btn-leave { background: #FA383E; color: white; }
    .leave-dialog .btn-leave:hover { background: #E5343A; }

    .loading {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; height: 100vh; gap: 16px;
    }

    .audio-suspended-banner {
      background: linear-gradient(90deg, #FF6B35, #F7931E);
      color: white; padding: 10px 16px;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      cursor: pointer; font-size: 14px; font-weight: 500;
      animation: pulseBanner 1.5s ease-in-out infinite;
    }
    .audio-suspended-banner:hover { filter: brightness(1.1); }
    .banner-icon { font-size: 18px; }
    @keyframes pulseBanner {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.85; }
    }
    .spinner {
      width: 40px; height: 40px; border: 3px solid #3A3B3C;
      border-top-color: #1877F2; border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading p { color: #B0B3B8; }

    .sticky-top {
      position: -webkit-sticky; /* Safari */
      position: sticky;
      top: 0;
      z-index: 100;
      background: #18191A; /* Ensure background for sticky overlay */
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
    .kinh-prize-badge {
      background: linear-gradient(135deg, #FFD700, #FFA500);
      padding: 2px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      color: #1a1a1a;
      text-shadow: 0 1px 0 rgba(255,255,255,0.3);
      box-shadow: 0 1px 3px rgba(255,165,0,0.4);
      animation: prizePulse 2s ease-in-out infinite;
    }
    @keyframes prizePulse {
      0%, 100% { box-shadow: 0 1px 3px rgba(255,165,0,0.4); }
      50% { box-shadow: 0 2px 8px rgba(255,165,0,0.6); }
    }

    .room-actions { display: flex; gap: 8px; align-items: center; }
    .hands-free-toggle {
      background: #3A3B3C; border: 1px solid #4E4F50; border-radius: 6px;
      padding: 4px 10px; cursor: pointer; font-size: 12px; font-weight: 600;
      color: #B0B3B8; font-family: inherit;
    }
    .hands-free-toggle.active { background: rgba(0,164,0,0.2); border-color: #00A400; color: #00A400; }
    .toggle-icon { font-size: 14px;  }
    .sound-toggle { background: none; border: 1px solid #3A3B3C; border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 18px; }
    .report-btn {
      background: none; border: 1px solid #3A3B3C; border-radius: 6px;
      padding: 4px 10px; cursor: pointer; font-size: 14px; color: #E4E6EB;
      display: flex; align-items: center; gap: 6px; font-family: inherit;
    }
    .report-btn ng-icon { font-size: 18px; }
    .report-btn:hover { border-color: #1877F2; color: #1877F2; }
    .music-toggle { background: none; border: 1px solid #3A3B3C; border-radius: 6px; padding: 4px 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .music-toggle .music-icon { width: 20px; height: 20px; stroke: #E4E6EB; }
    .music-toggle:hover { border-color: #1877F2; }
    .music-toggle:hover .music-icon { stroke: #1877F2; }
    .music-toggle.muted .music-icon { stroke: #65676B; }
    .leave-btn {
      background: #FA383E; border: none; color: white; padding: 6px 14px;
      border-radius: 6px; cursor: pointer; font-size: 13px; font-family: inherit;
      display: flex; align-items: center; gap: 6px;
    }
    .leave-btn ng-icon { font-size: 16px; }
    .leave-btn:hover:not(:disabled) { background: #E5343A; }
    .leave-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    /* Playing mode: show only room name, code, hands-free, sound-toggle */
    .room-header.playing-mode .price-badge,
    .room-header.playing-mode .kinh-prize-badge,
    .room-header.playing-mode .music-toggle,
    .room-header.playing-mode .report-btn,
    .room-header.playing-mode .leave-btn { display: none; }

    .room-body { display: flex; flex: 1; max-width: 1700px!important; }
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

    /* Sheets display */
    .my-sheets { margin-bottom: 16px; flex: 1; display: flex; flex-direction: column; }
    .sheets-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-shrink: 0; }
    .sheets-header h3 { margin: 0; font-size: 16px; color: #E4E6EB; }
    .sheets-grid {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      flex: 1;
      align-content: start;
    }

    /* Single sheet - maximize space on PC */
    .sheets-grid.single-sheet {
      grid-template-columns: 1fr;
      justify-items: center;
      align-content: center;
    }
    .sheets-grid.single-sheet app-sheet-display {
      width: 100%;
      max-width: 900px;
    }
    .sheets-grid.single-sheet ::ng-deep .sheet {
      max-width: 100% !important;
    }
    .sheets-grid.single-sheet ::ng-deep .cell {
      height: 56px;
    }
    .sheets-grid.single-sheet ::ng-deep .cell-num {
      font-size: 22px;
      font-weight: 600;
    }
    .sheets-grid.single-sheet ::ng-deep .sheet-title {
      font-size: 24px;
      padding: 12px 16px;
    }
    .sheets-grid.single-sheet ::ng-deep .ticket-number-badge {
      width: 30px;
      height: 30px;
      font-size: 16px;
    }
    .sheets-grid.single-sheet ::ng-deep .ticket-section {
      padding-left: 40px;
    }
    .sheets-grid.single-sheet ::ng-deep .ticket-row {
      gap: 4px;
    }

    /* Two sheets - side by side, maximize height */
    .sheets-grid.two-sheets {
      grid-template-columns: repeat(2, 1fr);
      align-content: center;
      gap: 24px;
    }
    .sheets-grid.two-sheets ::ng-deep .sheet {
      max-width: 100% !important;
    }
    .sheets-grid.two-sheets ::ng-deep .cell {
      height: 44px;
    }
    .sheets-grid.two-sheets ::ng-deep .cell-num {
      font-size: 17px;
      font-weight: 500;
    }
    .sheets-grid.two-sheets ::ng-deep .sheet-title {
      font-size: 18px;
    }

    @media (max-width: 1400px) {
      .sheets-grid.single-sheet ::ng-deep .cell { height: 48px; }
      .sheets-grid.single-sheet ::ng-deep .cell-num { font-size: 18px; }
      .sheets-grid.two-sheets ::ng-deep .cell { height: 38px; }
      .sheets-grid.two-sheets ::ng-deep .cell-num { font-size: 15px; }
    }

    @media (max-width: 1200px) {
      .sheets-grid.two-sheets {
        grid-template-columns: 1fr;
      }
    }

    /* Tablet landscape with 1 sheet - maximize display */
    @media (min-width: 768px) and (max-width: 1024px) and (orientation: landscape) {
      .sheets-grid.single-sheet ::ng-deep .cell { height: 44px; }
      .sheets-grid.single-sheet ::ng-deep .cell-num { font-size: 18px; }
      .sheets-grid.single-sheet app-sheet-display { max-width: 700px; }
    }

    @media (max-width: 640px) {
      .sheets-grid { grid-template-columns: 1fr; gap: 12px; }
      .sheets-grid.single-sheet ::ng-deep .cell { height: 32px; }
      .sheets-grid.single-sheet ::ng-deep .cell-num { font-size: 14px; font-weight: 500; }
      .sheets-grid.single-sheet ::ng-deep .sheet-title { font-size: 14px; padding: 8px 12px; }
      .sheets-grid.single-sheet ::ng-deep .ticket-number-badge { width: 20px; height: 20px; font-size: 11px; }
      .sheets-grid.single-sheet ::ng-deep .ticket-section { padding-left: 28px; }
    }

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

    /* Sidebar Ready Button Section (desktop) */
    .sidebar-ready-section {
      display: none; /* Hidden by default, shown on desktop via media query */
      background: #242526;
      border-radius: 12px;
      padding: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    .sidebar-ready-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 14px 16px;
      border-radius: 10px;
      border: 2px solid #4A4B4C;
      background: linear-gradient(135deg, #3A3B3C 0%, #2D2E2F 100%);
      color: #B0B3B8;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 2px;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.3s ease;
    }
    .sidebar-ready-btn:hover {
      background: linear-gradient(135deg, #4A4B4C 0%, #3A3B3C 100%);
      border-color: #5A5B5C;
    }
    .sidebar-ready-btn.is-ready {
      background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
      border-color: #FFE44D;
      color: #000000;
      box-shadow: 0 0 15px rgba(255, 215, 0, 0.5), 0 0 30px rgba(255, 165, 0, 0.3);
      animation: sidebarReadyPulse 2s ease-in-out infinite;
    }
    .sidebar-ready-btn.is-ready:hover {
      background: linear-gradient(135deg, #FFE14D 0%, #FFB732 100%);
    }
    .sidebar-ready-btn .ready-icon {
      font-size: 16px;
    }
    .sidebar-ready-btn .ready-text {
      text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    }
    .sidebar-ready-btn.is-ready .ready-text {
      text-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    @keyframes sidebarReadyPulse {
      0%, 100% {
        box-shadow: 0 0 15px rgba(255, 215, 0, 0.5), 0 0 30px rgba(255, 165, 0, 0.3);
      }
      50% {
        box-shadow: 0 0 20px rgba(255, 215, 0, 0.7), 0 0 40px rgba(255, 165, 0, 0.4);
      }
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
    .kinh-alert-icon { font-size: 48px; margin-bottom: 8px; color: #FFD700; animation: kinhBell 0.5s ease-in-out 0.2s; }
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
      max-height: 75vh; overflow: hidden;
      transform: translateY(100%); transition: transform 0.3s ease-out;
      padding: 12px 16px calc(24px + 68px + env(safe-area-inset-bottom, 0px));
      display: flex;
      flex-direction: column;
    }
    .sheet-panel app-player-list {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
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
      position: relative;
    }
    .bar-btn:active { background: #4E4F50; }
    .bar-icon { font-size: 18px; line-height: 1; }
    .bar-label { font-size: 11px; color: #B0B3B8; font-weight: 600; }
    .unread-badge {
      position: absolute; top: 4px; right: 4px;
      min-width: 18px; height: 18px; padding: 0 5px;
      background: #E53935; color: white; font-size: 10px; font-weight: 700;
      border-radius: 9px; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    .bar-kinh { flex: 2; display: flex; align-items: stretch; min-height: 48px; }
    .bar-kinh ::ng-deep app-kinh-button { display: flex; width: 100%; }
    .bar-kinh ::ng-deep .kinh-wrapper { width: 100%; display: flex; align-items: stretch; }
    .bar-kinh ::ng-deep .kinh-main-btn {
      padding: 0 6px !important; font-size: 15px !important; letter-spacing: 3px !important;
      width: 100%; border-radius: 12px !important; box-shadow: 0 2px 10px rgba(233,69,96,0.4) !important;
    }
    .bar-kinh ::ng-deep .kinh-main-btn:hover:not(:disabled) { transform: none !important; }
    .bar-kinh ::ng-deep .win-detected-info, .bar-kinh ::ng-deep .no-win-hint { display: none !important; }

    /* Mobile Ready Button */
    .bar-ready-btn {
      flex: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 48px;
      border-radius: 12px;
      border: 2px solid #4A4B4C;
      background: linear-gradient(135deg, #3A3B3C 0%, #2D2E2F 100%);
      color: #B0B3B8;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1px;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.3s ease;
    }
    .bar-ready-btn.is-ready {
      background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
      border-color: #FFE44D;
      color: #000000;
      box-shadow: 0 0 15px rgba(255, 215, 0, 0.5), 0 0 30px rgba(255, 165, 0, 0.3);
      animation: barReadyPulse 2s ease-in-out infinite;
    }
    .bar-ready-icon {
      font-size: 16px;
    }
    .bar-ready-text {
      font-size: 12px;
    }
    @keyframes barReadyPulse {
      0%, 100% {
        box-shadow: 0 0 15px rgba(255, 215, 0, 0.5), 0 0 30px rgba(255, 165, 0, 0.3);
      }
      50% {
        box-shadow: 0 0 20px rgba(255, 215, 0, 0.7), 0 0 40px rgba(255, 165, 0, 0.4);
      }
    }

    /* Desktop: hide mobile elements, show sidebar */
    .desktop-sidebar { display: none; }
    .desktop-player-list { display: block; }
    .inline-controls { margin-top: 0; margin-bottom: 12px; }

    /* Desktop (>= 768px): Floating sidebar layout */
    @media (min-width: 768px) {
      .room-body {
        position: relative;
        max-width: 1600px;
        margin: 0 auto;
        width: 100%;
      }
      .game-area {
        max-width: 1024px;
        margin: 0 auto;
        padding: 24px;
      }
      .desktop-sidebar {
        display: flex;
        flex-direction: column;
        position: fixed;
        top: 140px;
        right: calc((100vw - 1600px) / 2);
        width: 300px;
        max-height: calc(100vh - 160px);
        z-index: 50;
        gap: 12px;
      }
      .inline-controls {
        background: #242526;
        border-radius: 12px;
        // padding: 16px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        flex-shrink: 0;
      }
      .desktop-player-list {
        flex: 1;
        min-height: 0;
        overflow: hidden;
        background: #242526;
        border-radius: 12px;
        padding: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        display: flex;
        flex-direction: column;
      }
      .desktop-player-list app-player-list {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
      .sidebar-ready-section {
        display: block;
      }
    }
    /* Adjust for smaller screens (768px - 1600px) */
    @media (min-width: 768px) and (max-width: 1600px) {
      .desktop-sidebar {
        right: 24px;
      }
      .game-area {
        max-width: calc(100% - 320px);
        margin-left: 0;
        margin-right: auto;
      }
    }

    /* Large screens (>= 1600px): wider sidebar with flexbox layout */
    @media (min-width: 1600px) {
      .room-body {
        display: flex;
        gap: 24px;
        padding: 0 24px;
        max-width: none;
      }
      .game-area {
        flex: 1;
        max-width: none;
        margin: 0;
      }
      .desktop-sidebar {
        position: sticky;
        top: 140px;
        width: 400px;
        min-width: 400px;
        max-width: 400px;
        right: auto;
        align-self: flex-start;
      }
    }

    @media (max-width: 767px) {
      .near-win-toast-stack { top: 56px; }
      .room-header { padding: 8px 12px; flex-wrap: wrap; gap: 8px; }
      .room-title { gap: 6px; min-width: 0; flex: 1; }
      .room-title h2 { font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 85px; }
      .room-code, .price-badge, .kinh-prize-badge { font-size: 10px; padding: 1px 6px; }
      .room-actions { gap: 6px; flex-shrink: 0; }
      .hands-free-toggle { padding: 3px 8px; font-size: 11px; }
      .sound-toggle, .report-btn, .leave-btn { padding: 3px 6px; font-size: 16px; }
      .report-btn .btn-text, .leave-btn .btn-text { display: none; }
      .leave-btn { background: #FA383E; border: 1px solid #FA383E; border-radius: 6px; color: white; }
      .game-area { padding: 10px 12px; }
      .room-body { flex-direction: column; }
      .my-tickets { margin-bottom: 8px; }
      .tickets-header h3 { font-size: 14px; }
      .desktop-player-list, .inline-kinh, .inline-controls, .sidebar-ready-section { display: none; }
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
  private http = inject(HttpClient);
  private socketService = inject(SocketService);
  private authService = inject(AuthService);
  private audioService = inject(AudioService);
  youtubePlayerService = inject(YoutubePlayerService);
  chatService = inject(ChatService);
  private reportService = inject(ReportService);

  // Report dialog state
  showReportDialog = signal(false);

  // Leave confirmation dialog state
  showLeaveDialog = signal(false);

  // Password dialog state
  showPasswordDialog = signal(false);
  passwordError = signal<string | null>(null);
  roomPassword = '';
  private pendingRoomCode: string | null = null;

  // Room not found popup state
  showRoomNotFoundPopup = signal(false);

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
  bgMusicMuted = signal(false);
  handsFreeMode = signal(false);
  audioSuspended = signal(false);
  private readonly HANDS_FREE_KEY = 'loto_hands_free_mode';

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

  // Players with sheet counts
  playersWithSheetCounts = computed(() => {
    const players = this.players();
    const takenMap = this.takenSheets();
    // Count sheets per user
    const sheetCountByUser = new Map<number, number>();
    for (const userId of takenMap.values()) {
      sheetCountByUser.set(userId, (sheetCountByUser.get(userId) || 0) + 1);
    }
    return players.map(p => ({
      ...p,
      sheetCount: sheetCountByUser.get(p.userId) || 0,
    }));
  });

  // Total prize for KINH (total sheets * price per sheet)
  totalKinhPrize = computed(() => {
    const takenMap = this.takenSheets();
    const pricePerSheet = this.room()?.pricePerSheet || 0;
    return takenMap.size * pricePerSheet;
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
  isCurrentUserReady = computed(() => {
    const userId = this.currentUserId();
    const player = this.players().find(p => p.userId === userId);
    return player?.isReady ?? false;
  });

  // Group my tickets into sheets for display
  mySheets = computed(() => {
    const tickets = this.myTickets();
    const sheets = this.availableSheets();
    const userId = this.currentUserId();
    const takenMap = this.takenSheets();

    // Find sheets that belong to current user
    const mySheetsList: SheetInfo[] = [];
    for (const sheet of sheets) {
      if (takenMap.get(sheet.id) === userId) {
        mySheetsList.push(sheet);
      }
    }
    return mySheetsList;
  });

  // Get owner display name
  ownerDisplayName = computed(() => {
    const room = this.room();
    if (!room) return 'Lô Tô';
    const owner = this.players().find(p => p.userId === room.ownerId);
    return owner?.displayName || 'Lô Tô';
  });

  constructor() {
    afterNextRender(() => this.updateMaxColumns());
  }

  ngOnInit() {
    this.socketService.connect();
    const roomCode = this.route.snapshot.paramMap.get('code');
    if (roomCode) {
      this.checkAndJoinRoom(roomCode);
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

    // Track audio suspended state (after sleep/background)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  private onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      // Check if audio is suspended after returning from background
      this.audioSuspended.set(this.audioService.isSuspended());
    }
  };

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopBackgroundMusic();
    this.chatService.leaveRoom();
    const room = this.room();
    if (room) {
      this.socketService.emit('room:leave', { roomId: room.id });
    }
    // Clean up visibility listener
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  private startBackgroundMusic(url: string): void {
    // Create hidden container for YouTube player
    let container = document.getElementById('yt-music-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'yt-music-container';
      container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;overflow:hidden;';
      document.body.appendChild(container);
    }
    this.youtubePlayerService.play(url, container);
  }

  private stopBackgroundMusic(): void {
    this.youtubePlayerService.destroyPlayer();
  }

  getWinTypeLabel(type: string): string {
    switch (type) {
      case 'horizontal': return 'Hàng ngang';
      case 'vertical': return 'Hàng dọc';
      case 'diagonal': return 'Đường chéo';
      default: return type;
    }
  }

  private checkAndJoinRoom(roomCode: string) {
    // Try to join directly - backend will check if password is needed
    // If user is owner, they'll be allowed in without password
    // If password is required and user is not owner, socket will return error
    // and we'll show the password dialog then
    this.pendingRoomCode = roomCode;
    this.socketService.emit('room:join', { roomCode });
  }

  submitPassword() {
    if (!this.pendingRoomCode || !this.roomPassword) return;
    this.passwordError.set(null);
    this.socketService.emit('room:join', {
      roomCode: this.pendingRoomCode,
      password: this.roomPassword,
    });
  }

  cancelPasswordDialog() {
    this.showPasswordDialog.set(false);
    this.pendingRoomCode = null;
    this.roomPassword = '';
    this.passwordError.set(null);
    this.router.navigate(['/lobby']);
  }

  private setupSocketListeners() {
    // Room joined
    this.socketService
      .on<{ room: RoomData; players: Player[]; sheets: SheetInfo[]; session?: { id: number; status: string; calledNumbers: number[] }; purchasedSheets?: Record<string, number>; markedCells?: string[]; chatHistory?: Array<{ id: string; senderId: number; senderName: string; senderAvatar: string | null; content: string; timestamp: Date; type: 'text' | 'system' }> }>('room:joined')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        // Close password dialog on successful join
        this.showPasswordDialog.set(false);
        this.pendingRoomCode = null;
        this.roomPassword = '';
        this.passwordError.set(null);

        this.room.set(data.room);
        this.players.set(data.players);
        this.availableSheets.set(data.sheets);

        // Join chat for this room and load history
        this.chatService.joinRoom(data.room.roomCode);
        if (data.chatHistory && data.chatHistory.length > 0) {
          this.chatService.loadHistory(data.chatHistory);
        }

        // Restore hands-free mode preference if room allows it
        if (data.room.allowHandsFree) {
          this.handsFreeMode.set(this.getHandsFreePreference());
        } else {
          // Room doesn't allow hands-free, force manual mode
          this.handsFreeMode.set(false);
        }

        // Preload voice pack audio files
        if (data.room.callVoice && data.room.callVoice !== 'default') {
          this.audioService.preloadVoicePack(data.room.callVoice as any);
        }

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

        // Restore marked cells from server (for reconnection after sleep/refresh)
        if (data.markedCells && data.markedCells.length > 0) {
          this.markedCells.set(new Set(data.markedCells));
          console.log(`Restored ${data.markedCells.length} marked cells from server`);
        } else {
          this.markedCells.set(new Set());
        }

        this.audioService.play('join');

        // Play background music if available and game not started
        console.log('[Room] backgroundMusicUrl:', data.room.backgroundMusicUrl, 'session status:', data.session?.status);
        if (data.room.backgroundMusicUrl && data.session?.status !== 'active') {
          console.log('[Room] Starting background music');
          this.startBackgroundMusic(data.room.backgroundMusicUrl);
        }
      });

    // Player joined
    this.socketService
      .on<{ userId: number; displayName: string; avatarUrl: string | null; winCount?: number }>('room:player-joined')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.players.update((p) => [
          ...p.filter(x => x.userId !== data.userId),
          { userId: data.userId, displayName: data.displayName, avatarUrl: data.avatarUrl, isOnline: true, isReady: false, winCount: data.winCount ?? 0 },
        ]);
        this.audioService.play('join');
      });

    // Player ready status changed
    this.socketService
      .on<{ userId: number; isReady: boolean }>('player:ready-changed')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.players.update((p) =>
          p.map(player =>
            player.userId === data.userId
              ? { ...player, isReady: data.isReady }
              : player
          )
        );
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

        // Remove returned tickets from myTickets
        if (data.userId === this.currentUserId()) {
          const releasedSheetIds = new Set(data.sheetIds);
          const sheets = this.availableSheets();
          const releasedTicketIds = new Set<number>();
          for (const sheet of sheets) {
            if (releasedSheetIds.has(sheet.id)) {
              for (const t of sheet.tickets) {
                releasedTicketIds.add(t.id);
              }
            }
          }
          this.myTickets.update((tickets) =>
            tickets.filter((t) => !releasedTicketIds.has(t.id)),
          );
        }
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
        // Reset all players' ready status
        this.players.update((p) => p.map(player => ({ ...player, isReady: false })));
        // Sync auto-call checkbox with room's callMode
        this.autoCallEnabled.set(this.room()?.callMode === 'auto');
        // Stop background music when game starts
        this.stopBackgroundMusic();
        this.audioService.play('start');
      });

    // Number called
    this.socketService
      .on<{ number: number; calledNumbers: number[] }>('game:number-called')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.calledNumbers.set(data.calledNumbers);
        this.lastCalledNumber.set(data.number);
        const voice = (this.room()?.callVoice as any) || 'default';
        this.audioService.playNumberCalled(data.number, voice);

        // Hands-free mode: auto-mark + auto-KINH (only if room allows it)
        if (this.handsFreeMode() && this.room()?.allowHandsFree) {
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

        // Ensure gameStatus is paused_for_kinh when we receive claims
        // (fixes race condition when owner claims KINH themselves - events may arrive out of order)
        if (data.claims.length > 0 && this.gameStatus() !== 'paused_for_kinh') {
          this.gameStatus.set('paused_for_kinh');
        }

        this.audioService.play('kinh');
      });

    // Kinh verify request (owner only) — array of claims
    this.socketService
      .on<{ claims: KinhVerifyClaimItem[] }>('kinh:verify-request')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.verifyClaims.set(data.claims);

        // Ensure gameStatus is paused_for_kinh when we receive verify request
        // (fixes race condition when owner claims KINH themselves - events may arrive out of order)
        if (data.claims.length > 0 && this.gameStatus() !== 'paused_for_kinh') {
          this.gameStatus.set('paused_for_kinh');
        }

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
        // Reset all players' ready status
        this.players.update((p) => p.map(player => ({ ...player, isReady: false })));
        // Resume background music when game resets
        const bgMusic = this.room()?.backgroundMusicUrl;
        if (bgMusic) {
          this.startBackgroundMusic(bgMusic);
        }
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

        // Handle room not found error
        if (data.message.toLowerCase().includes('room not found') ||
            data.message.toLowerCase().includes('not found')) {
          this.showRoomNotFoundPopup.set(true);
          return;
        }

        // Handle password errors
        if (data.message === 'Password required' || data.message === 'Invalid password') {
          this.passwordError.set(data.message === 'Password required'
            ? 'Phòng này yêu cầu mật khẩu'
            : 'Mật khẩu không đúng');
          // If dialog was not shown (e.g., direct join attempt), show it now
          if (!this.showPasswordDialog()) {
            const roomCode = this.route.snapshot.paramMap.get('code');
            if (roomCode) {
              this.pendingRoomCode = roomCode;
              this.showPasswordDialog.set(true);
            }
          }
          return;
        }

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

  returnSheet(sheet: SheetInfo) {
    const sid = this.sessionId();
    if (!sid) return;
    this.socketService.emit('sheet:return', { sessionId: sid, sheetId: sheet.id });
  }

  onNumberLookup(num: number) {
    this.highlightCalledNumber.set(num);
  }

  onCellClicked(event: { ticketId: number; rowIndex: number; colIndex: number; number: number }) {
    // Resume AudioContext on user interaction (required after sleep/background)
    this.audioService.resumeFromUserInteraction();
    this.audioSuspended.set(false);

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
    // Save preference to localStorage
    localStorage.setItem(this.HANDS_FREE_KEY, String(this.handsFreeMode()));
  }

  private getHandsFreePreference(): boolean {
    const saved = localStorage.getItem(this.HANDS_FREE_KEY);
    // Default to false (manual mode) if no preference saved
    return saved === 'true';
  }

  toggleReady() {
    // Resume AudioContext on user interaction (required after sleep/background)
    this.audioService.resumeFromUserInteraction();
    this.audioSuspended.set(false);
    const newReady = !this.isCurrentUserReady();
    this.socketService.emit('player:set-ready', { ready: newReady });
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
      const isOpening = !this.showPlayerSheet();
      this.showPlayerSheet.set(isOpening);
      // When closing player sheet, close chat panel to enable unread counting
      if (!isOpening) {
        this.chatService.closePanel();
      }
    } else {
      // Close player sheet and chat panel
      if (this.showPlayerSheet()) {
        this.chatService.closePanel();
      }
      this.showPlayerSheet.set(false);
      this.showControlsSheet.set(!this.showControlsSheet());
    }
  }

  closePlayerSheet() {
    this.showPlayerSheet.set(false);
    this.chatService.closePanel();
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

  showLeaveConfirm() {
    if (this.isGameInProgress()) return;
    this.showLeaveDialog.set(true);
  }

  cancelLeaveDialog() {
    this.showLeaveDialog.set(false);
  }

  onRoomNotFoundOk() {
    this.showRoomNotFoundPopup.set(false);
    this.router.navigate(['/lobby']);
  }

  confirmLeaveRoom() {
    this.showLeaveDialog.set(false);
    const room = this.room();
    if (room) {
      this.socketService.emit('room:leave', { roomId: room.id });
    }
    this.router.navigate(['/lobby']);
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
    // Resume AudioContext on user interaction (required after sleep/background)
    this.audioService.resumeFromUserInteraction();
    this.audioSuspended.set(false);
    this.soundEnabled.set(this.audioService.toggle());
  }

  resumeAudio() {
    this.audioService.resumeFromUserInteraction();
    this.audioSuspended.set(false);
    // Play a small sound to confirm audio is working
    this.audioService.play('mark');
  }

  toggleBgMusic() {
    if (this.bgMusicMuted()) {
      this.youtubePlayerService.unmute();
      this.bgMusicMuted.set(false);
    } else {
      this.youtubePlayerService.mute();
      this.bgMusicMuted.set(true);
    }
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

  openReportDialog() {
    const roomCode = this.room()?.roomCode;
    if (roomCode) {
      this.reportService.loadAllReports(roomCode);
      this.showReportDialog.set(true);
    }
  }

  closeReportDialog() {
    this.showReportDialog.set(false);
  }
}
