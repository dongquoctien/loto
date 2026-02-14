import { Component, signal, input, output, computed, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, NgClass } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  iconoirXmark,
  iconoirTrophy,
  iconoirUser,
  iconoirArrowUp,
  iconoirArrowDown,
  iconoirGroup,
} from '@ng-icons/iconoir';
import { PersonalReport, RoomReport, PlayerDebt, RoomReportPlayer } from '@loto/shared';
import { ReportService } from '../../../../core/services/report.service';

type TabType = 'personal' | 'room';

@Component({
  selector: 'app-report-dialog',
  standalone: true,
  imports: [CommonModule, NgIcon],
  viewProviders: [
    provideIcons({
      iconoirXmark,
      iconoirTrophy,
      iconoirUser,
      iconoirArrowUp,
      iconoirArrowDown,
      iconoirGroup,
    }),
  ],
  template: `
    <div class="dialog-backdrop" (click)="onBackdropClick($event)">
      <div class="dialog-container">
        <div class="dialog-header">
          <h2>Báo Cáo Thống Kê</h2>
          <button class="close-btn" (click)="close.emit()">
            <ng-icon name="iconoirXmark"></ng-icon>
          </button>
        </div>

        <div class="tab-bar">
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'personal'"
            (click)="activeTab.set('personal')"
          >
            <ng-icon name="iconoirUser"></ng-icon>
            Cá Nhân
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'room'"
            (click)="activeTab.set('room')"
          >
            <ng-icon name="iconoirGroup"></ng-icon>
            Bảng Xếp Hạng
          </button>
        </div>

        <div class="dialog-content">
          @if (reportService.loading()) {
            <div class="loading-state">
              <div class="spinner"></div>
              <p>Đang tải báo cáo...</p>
            </div>
          } @else if (reportService.error()) {
            <div class="error-state">
              <p>{{ reportService.error() }}</p>
            </div>
          } @else {
            @if (activeTab() === 'personal') {
              @if (reportService.personalReport(); as report) {
                <div class="personal-report">
                  <div class="summary-cards">
                    <div class="summary-card" [class.positive]="report.totalProfit > 0" [class.negative]="report.totalProfit < 0">
                      <div class="card-icon">
                        <ng-icon [name]="report.totalProfit >= 0 ? 'iconoirArrowUp' : 'iconoirArrowDown'"></ng-icon>
                      </div>
                      <div class="card-content">
                        <span class="card-label">Tổng Lợi Nhuận</span>
                        <span class="card-value">{{ formatMoney(report.totalProfit) }}</span>
                      </div>
                    </div>
                    <div class="summary-card wins">
                      <div class="card-icon">
                        <ng-icon name="iconoirTrophy"></ng-icon>
                      </div>
                      <div class="card-content">
                        <span class="card-label">Thắng / Thua</span>
                        <span class="card-value">{{ report.totalWins }} / {{ report.totalLosses }}</span>
                      </div>
                    </div>
                  </div>

                  @if (report.owedToMe.length > 0) {
                    <div class="debt-section">
                      <h3 class="section-title positive-title">
                        <ng-icon name="iconoirArrowUp"></ng-icon>
                        Người Nợ Bạn
                      </h3>
                      <div class="debt-list">
                        @for (debt of report.owedToMe; track debt.userId) {
                          <div class="debt-item">
                            <div class="debt-user">
                              @if (debt.avatarUrl) {
                                <img [src]="debt.avatarUrl" [alt]="debt.displayName" class="avatar" />
                              } @else {
                                <div class="avatar-placeholder">{{ debt.displayName.charAt(0) }}</div>
                              }
                              <div class="debt-info">
                                <span class="debt-name">{{ debt.displayName }}</span>
                                <span class="debt-games">{{ debt.gameCount }} ván</span>
                              </div>
                            </div>
                            <span class="debt-amount positive">+{{ formatMoney(debt.amount) }}</span>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  @if (report.iOwe.length > 0) {
                    <div class="debt-section">
                      <h3 class="section-title negative-title">
                        <ng-icon name="iconoirArrowDown"></ng-icon>
                        Bạn Nợ
                      </h3>
                      <div class="debt-list">
                        @for (debt of report.iOwe; track debt.userId) {
                          <div class="debt-item">
                            <div class="debt-user">
                              @if (debt.avatarUrl) {
                                <img [src]="debt.avatarUrl" [alt]="debt.displayName" class="avatar" />
                              } @else {
                                <div class="avatar-placeholder">{{ debt.displayName.charAt(0) }}</div>
                              }
                              <div class="debt-info">
                                <span class="debt-name">{{ debt.displayName }}</span>
                                <span class="debt-games">{{ debt.gameCount }} ván</span>
                              </div>
                            </div>
                            <span class="debt-amount negative">-{{ formatMoney(debt.amount) }}</span>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  @if (report.owedToMe.length === 0 && report.iOwe.length === 0) {
                    <div class="empty-state">
                      <p>Chưa có dữ liệu thống kê. Hãy chơi một vài ván!</p>
                    </div>
                  }
                </div>
              }
            } @else {
              @if (reportService.roomReport(); as report) {
                <div class="room-report">
                  <div class="room-info">
                    <span class="room-name">{{ report.roomName }}</span>
                    <span class="room-stats">{{ report.totalGames }} ván • {{ formatMoney(report.pricePerSheet) }}/tờ</span>
                  </div>

                  @if (report.players.length > 0) {
                    <div class="leaderboard">
                      @for (player of report.players; track player.userId; let i = $index) {
                        <div class="leaderboard-item" [class.top-3]="i < 3">
                          <span class="rank" [class.gold]="i === 0" [class.silver]="i === 1" [class.bronze]="i === 2">
                            {{ i + 1 }}
                          </span>
                          <div class="player-info">
                            @if (player.avatarUrl) {
                              <img [src]="player.avatarUrl" [alt]="player.displayName" class="avatar" />
                            } @else {
                              <div class="avatar-placeholder">{{ player.displayName.charAt(0) }}</div>
                            }
                            <div class="player-details">
                              <span class="player-name">{{ player.displayName }}</span>
                              <span class="player-stats">{{ player.wins }}W / {{ player.losses }}L • {{ player.gamesPlayed }} ván</span>
                            </div>
                          </div>
                          <span class="player-profit" [class.positive]="player.totalProfit > 0" [class.negative]="player.totalProfit < 0">
                            {{ player.totalProfit >= 0 ? '+' : '' }}{{ formatMoney(player.totalProfit) }}
                          </span>
                        </div>
                      }
                    </div>
                  } @else {
                    <div class="empty-state">
                      <p>Chưa có dữ liệu thống kê. Hãy chơi một vài ván!</p>
                    </div>
                  }
                </div>
              }
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .dialog-container {
      background: #242526;
      border-radius: 16px;
      width: 100%;
      max-width: 500px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);

      h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #fff;
      }

      .close-btn {
        background: transparent;
        border: none;
        color: #888;
        cursor: pointer;
        padding: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: all 0.2s;

        &:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        ng-icon {
          font-size: 1.25rem;
        }
      }
    }

    .tab-bar {
      display: flex;
      padding: 0.75rem;
      gap: 0.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .tab-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: transparent;
      border: none;
      border-radius: 8px;
      color: #888;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #aaa;
      }

      &.active {
        background: linear-gradient(135deg, #4a9eff 0%, #6366f1 100%);
        color: #fff;
      }

      ng-icon {
        font-size: 1rem;
      }
    }

    .dialog-content {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
    }

    .loading-state, .error-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1rem;
      color: #888;
      text-align: center;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: #4a9eff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }

    .summary-card {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;

      .card-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.1);

        ng-icon {
          font-size: 1.25rem;
          color: #888;
        }
      }

      .card-content {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .card-label {
        font-size: 0.75rem;
        color: #888;
      }

      .card-value {
        font-size: 1rem;
        font-weight: 600;
        color: #fff;
      }

      &.positive {
        .card-icon {
          background: rgba(34, 197, 94, 0.2);
          ng-icon { color: #22c55e; }
        }
        .card-value { color: #22c55e; }
      }

      &.negative {
        .card-icon {
          background: rgba(239, 68, 68, 0.2);
          ng-icon { color: #ef4444; }
        }
        .card-value { color: #ef4444; }
      }

      &.wins {
        .card-icon {
          background: rgba(234, 179, 8, 0.2);
          ng-icon { color: #eab308; }
        }
      }
    }

    .debt-section {
      margin-bottom: 1.25rem;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      font-weight: 600;
      margin: 0 0 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);

      ng-icon {
        font-size: 1rem;
      }

      &.positive-title {
        color: #22c55e;
      }

      &.negative-title {
        color: #ef4444;
      }
    }

    .debt-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .debt-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 10px;
    }

    .debt-user {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      object-fit: cover;
    }

    .avatar-placeholder {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4a9eff 0%, #6366f1 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
      font-weight: 600;
      color: #fff;
    }

    .debt-info {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .debt-name {
      font-size: 0.9rem;
      font-weight: 500;
      color: #fff;
    }

    .debt-games {
      font-size: 0.75rem;
      color: #888;
    }

    .debt-amount {
      font-size: 0.95rem;
      font-weight: 600;

      &.positive {
        color: #22c55e;
      }

      &.negative {
        color: #ef4444;
      }
    }

    .room-info {
      text-align: center;
      padding-bottom: 1rem;
      margin-bottom: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);

      .room-name {
        display: block;
        font-size: 1.1rem;
        font-weight: 600;
        color: #fff;
        margin-bottom: 0.25rem;
      }

      .room-stats {
        font-size: 0.85rem;
        color: #888;
      }
    }

    .leaderboard {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .leaderboard-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 10px;

      &.top-3 {
        background: rgba(255, 255, 255, 0.05);
      }
    }

    .rank {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      font-weight: 700;
      background: rgba(255, 255, 255, 0.1);
      color: #888;

      &.gold {
        background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%);
        color: #000;
      }

      &.silver {
        background: linear-gradient(135deg, #c0c0c0 0%, #a8a8a8 100%);
        color: #000;
      }

      &.bronze {
        background: linear-gradient(135deg, #cd7f32 0%, #b87333 100%);
        color: #fff;
      }
    }

    .player-info {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }

    .player-details {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      min-width: 0;
    }

    .player-name {
      font-size: 0.9rem;
      font-weight: 500;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .player-stats {
      font-size: 0.75rem;
      color: #888;
    }

    .player-profit {
      font-size: 0.9rem;
      font-weight: 600;
      color: #888;
      white-space: nowrap;

      &.positive {
        color: #22c55e;
      }

      &.negative {
        color: #ef4444;
      }
    }

    @media (max-width: 480px) {
      .dialog-container {
        max-height: 90vh;
      }

      .summary-cards {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class ReportDialogComponent {
  close = output<void>();

  reportService = inject(ReportService);
  activeTab = signal<TabType>('personal');

  formatMoney(amount: number): string {
    if (amount === 0) return '0đ';
    const absAmount = Math.abs(amount);
    if (absAmount >= 1000000) {
      return (amount / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (absAmount >= 1000) {
      return (amount / 1000).toFixed(0) + 'K';
    }
    return amount.toLocaleString('vi-VN') + 'đ';
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('dialog-backdrop')) {
      this.close.emit();
    }
  }
}
