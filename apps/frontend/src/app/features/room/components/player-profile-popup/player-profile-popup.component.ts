import { Component, Input, Output, EventEmitter, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { iconoirXmark, iconoirTrophy, iconoirGamepad, iconoirWallet, iconoirNavArrowDown } from '@ng-icons/iconoir';
import { environment } from '../../../../../environments/environment';

export interface PlayerProfile {
  id: number;
  displayName: string;
  avatarUrl: string | null;
  qrCodeUrl: string | null;
  winCount: number;
  gamesPlayed: number;
  winRate: number;
  totalRevenue: number;
}

@Component({
  selector: 'app-player-profile-popup',
  standalone: true,
  imports: [CommonModule, DecimalPipe, NgIcon],
  viewProviders: [provideIcons({ iconoirXmark, iconoirTrophy, iconoirGamepad, iconoirWallet, iconoirNavArrowDown })],
  template: `
    <div class="overlay" (click)="close.emit()">
      <div class="profile-card" (click)="$event.stopPropagation()">
        <!-- Close button -->
        <button class="close-btn" (click)="close.emit()">
          <ng-icon name="iconoirXmark"></ng-icon>
        </button>

        @if (loading()) {
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <span>Đang tải...</span>
          </div>
        } @else if (error()) {
          <div class="error-state">
            <span>Không thể tải thông tin</span>
            <button class="retry-btn" (click)="loadProfile()">Thử lại</button>
          </div>
        } @else if (profile()) {
          <!-- Avatar Section -->
          <div class="avatar-section">
            <div class="avatar-ring">
              <div class="avatar-container" [ngClass]="'rank-' + getRank(profile()!.winCount)">
                @if (profile()!.avatarUrl) {
                  <img [src]="profile()!.avatarUrl" [alt]="profile()!.displayName" />
                } @else {
                  <span class="avatar-placeholder">{{ profile()!.displayName?.charAt(0) || '?' }}</span>
                }
              </div>
            </div>

            <!-- Rank badge floating -->
            @if (profile()!.winCount > 0) {
              <div class="rank-badge" [ngClass]="'rank-' + getRank(profile()!.winCount)">
                <span class="rank-icon">{{ getRankIcon(profile()!.winCount) }}</span>
                <span class="rank-name">{{ getRankName(profile()!.winCount) }}</span>
              </div>
            }
          </div>

          <!-- Name & Win Badge -->
          <div class="name-section">
            <h2 class="player-name">{{ profile()!.displayName }}</h2>
            <!-- @if (profile()!.winCount > 0) {
              <span class="win-count-badge" [ngClass]="'rank-' + getRank(profile()!.winCount)">
                {{ getRankIcon(profile()!.winCount) }} {{ profile()!.winCount }} thắng
              </span>
            } -->
          </div>

          <!-- Win Rate - Hero Section -->
          <div class="winrate-hero">
            <div class="winrate-circle" [ngClass]="getWinRateClass(profile()!.winRate)">
              <span class="winrate-value">{{ profile()!.winRate }}%</span>
              <span class="winrate-label">Tỷ lệ thắng</span>
            </div>
            <div class="winrate-details">
              <div class="detail-item">
                <ng-icon name="iconoirGamepad" class="detail-icon"></ng-icon>
                <div class="detail-content">
                  <span class="detail-value">{{ profile()!.gamesPlayed }}</span>
                  <span class="detail-label">Trận đã chơi</span>
                </div>
              </div>
              <div class="detail-item">
                <ng-icon name="iconoirTrophy" class="detail-icon trophy-icon"></ng-icon>
                <div class="detail-content">
                  <span class="detail-value">{{ profile()!.winCount }}</span>
                  <span class="detail-label">Trận thắng</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Total Revenue (Net Profit) -->
          <div class="revenue-section" [class.negative]="profile()!.totalRevenue < 0">
            <div class="revenue-header">
              <ng-icon name="iconoirWallet" class="revenue-icon"></ng-icon>
              <span class="revenue-title">Lợi nhuận</span>
            </div>
            <div class="revenue-amount">
              {{ profile()!.totalRevenue >= 0 ? '+' : '' }}{{ profile()!.totalRevenue | number:'1.0-0' }}đ
            </div>
            <span class="revenue-note">Tiền thắng - Tiền thua</span>
          </div>

          <!-- QR Code Section (Collapsible) -->
          @if (profile()!.qrCodeUrl) {
            <div class="qr-section" [class.expanded]="qrExpanded()">
              <button class="qr-header" (click)="toggleQr()">
                <span class="qr-title">Mã QR Chuyển Khoản</span>
                <ng-icon name="iconoirNavArrowDown" class="qr-toggle-icon"></ng-icon>
              </button>
              @if (qrExpanded()) {
                <div class="qr-container">
                  <img [src]="profile()!.qrCodeUrl" alt="QR Code" class="qr-image" />
                </div>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
      animation: overlayFadeIn 0.25s ease-out;
    }
    @keyframes overlayFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .profile-card {
      background: linear-gradient(170deg, #2C2D2E 0%, #1A1B1C 100%);
      border: 1px solid #3A3B3C;
      border-radius: 20px;
      padding: 24px;
      width: 100%;
      max-width: 360px;
      max-height: calc(100vh - 32px);
      overflow-y: auto;
      position: relative;
      animation: cardSlideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }
    @keyframes cardSlideUp {
      from {
        opacity: 0;
        transform: translateY(40px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    .profile-card::-webkit-scrollbar { width: 0; }
    .profile-card { scrollbar-width: none; }

    .close-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
      border: none;
      color: #B0B3B8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      font-size: 18px;
      z-index: 10;
    }
    .close-btn:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #E4E6EB;
    }

    /* Loading & Error States */
    .loading-state, .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      gap: 16px;
      color: #B0B3B8;
    }
    .loading-spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(24, 119, 242, 0.2);
      border-top-color: #1877F2;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .retry-btn {
      background: #1877F2;
      border: none;
      color: white;
      padding: 8px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-family: inherit;
    }

    /* Avatar Section */
    .avatar-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 16px;
      position: relative;
    }
    .avatar-ring {
      padding: 4px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1877F2, #00D4FF);
      position: relative;
    }
    .avatar-container {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #3A3B3C;
      border: 3px solid #1A1B1C;
    }
    .avatar-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .avatar-placeholder {
      font-size: 40px;
      color: #B0B3B8;
      font-weight: 700;
    }

    /* Rank-based avatar ring colors */
    .avatar-container.rank-iron { }
    .avatar-container.rank-bronze { }
    .avatar-container.rank-silver { }
    .avatar-container.rank-gold { }
    .avatar-container.rank-diamond { }

    .avatar-ring:has(.rank-bronze) {
      background: linear-gradient(135deg, #CD7F32, #8B5A2B);
    }
    .avatar-ring:has(.rank-silver) {
      background: linear-gradient(135deg, #C0C0C0, #A8A8A8);
    }
    .avatar-ring:has(.rank-gold) {
      background: linear-gradient(135deg, #FFD700, #FFA500);
    }
    .avatar-ring:has(.rank-diamond) {
      background: linear-gradient(135deg, #B9F2FF, #64C8FF, #00D4FF);
      animation: diamondGlow 2s ease-in-out infinite;
    }
    @keyframes diamondGlow {
      0%, 100% { box-shadow: 0 0 10px rgba(185, 242, 255, 0.3); }
      50% { box-shadow: 0 0 20px rgba(185, 242, 255, 0.5), 0 0 30px rgba(100, 200, 255, 0.3); }
    }

    /* Rank Badge */
    .rank-badge {
      position: absolute;
      bottom: -8px;
      background: #2C2D2E;
      padding: 4px 12px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .rank-badge.rank-iron { color: #8A8A8A; border-color: rgba(138, 138, 138, 0.3); }
    .rank-badge.rank-bronze { color: #CD7F32; border-color: rgba(205, 127, 50, 0.3); }
    .rank-badge.rank-silver { color: #C0C0C0; border-color: rgba(192, 192, 192, 0.3); }
    .rank-badge.rank-gold { color: #FFD700; border-color: rgba(255, 215, 0, 0.3); }
    .rank-badge.rank-diamond {
      color: #B9F2FF;
      border-color: rgba(185, 242, 255, 0.4);
      text-shadow: 0 0 6px rgba(185, 242, 255, 0.5);
    }
    .rank-icon { font-size: 14px; }

    /* Name Section */
    .name-section {
      text-align: center;
      margin-bottom: 20px;
    }
    .player-name {
      color: #E4E6EB;
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 8px;
    }
    .win-count-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 700;
    }
    .win-count-badge.rank-iron {
      color: #8A8A8A;
      background: rgba(138, 138, 138, 0.12);
      border: 1px solid rgba(138, 138, 138, 0.25);
    }
    .win-count-badge.rank-bronze {
      color: #CD7F32;
      background: rgba(205, 127, 50, 0.12);
      border: 1px solid rgba(205, 127, 50, 0.25);
    }
    .win-count-badge.rank-silver {
      color: #C0C0C0;
      background: rgba(192, 192, 192, 0.15);
      border: 1px solid rgba(192, 192, 192, 0.30);
    }
    .win-count-badge.rank-gold {
      color: #FFD700;
      background: rgba(255, 215, 0, 0.12);
      border: 1px solid rgba(255, 215, 0, 0.25);
    }
    .win-count-badge.rank-diamond {
      color: #B9F2FF;
      background: linear-gradient(135deg, rgba(185, 242, 255, 0.15), rgba(100, 200, 255, 0.08));
      border: 1px solid rgba(185, 242, 255, 0.35);
      text-shadow: 0 0 6px rgba(185, 242, 255, 0.6);
    }

    /* Win Rate Hero Section */
    .winrate-hero {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 20px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 16px;
      margin-bottom: 16px;
    }
    .winrate-circle {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      position: relative;
      background: rgba(76, 175, 80, 0.1);
      border: 3px solid #4CAF50;
    }
    .winrate-circle.low {
      background: rgba(255, 152, 0, 0.1);
      border-color: #FF9800;
    }
    .winrate-circle.medium {
      background: rgba(76, 175, 80, 0.1);
      border-color: #4CAF50;
    }
    .winrate-circle.high {
      background: rgba(255, 215, 0, 0.1);
      border-color: #FFD700;
      box-shadow: 0 0 15px rgba(255, 215, 0, 0.2);
    }
    .winrate-circle.elite {
      background: linear-gradient(135deg, rgba(185, 242, 255, 0.1), rgba(100, 200, 255, 0.05));
      border-color: #B9F2FF;
      box-shadow: 0 0 20px rgba(185, 242, 255, 0.25);
      animation: elitePulse 2s ease-in-out infinite;
    }
    @keyframes elitePulse {
      0%, 100% { box-shadow: 0 0 15px rgba(185, 242, 255, 0.2); }
      50% { box-shadow: 0 0 25px rgba(185, 242, 255, 0.35); }
    }
    .winrate-value {
      font-size: 26px;
      font-weight: 800;
      line-height: 1;
    }
    .winrate-circle.low .winrate-value { color: #FF9800; }
    .winrate-circle.medium .winrate-value { color: #4CAF50; }
    .winrate-circle.high .winrate-value { color: #FFD700; }
    .winrate-circle.elite .winrate-value { color: #B9F2FF; text-shadow: 0 0 10px rgba(185, 242, 255, 0.5); }
    .winrate-label {
      font-size: 10px;
      color: #B0B3B8;
      margin-top: 2px;
    }

    .winrate-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .detail-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .detail-icon {
      font-size: 22px;
      color: #B0B3B8;
    }
    .trophy-icon {
      color: #FFD700;
    }
    .detail-content {
      display: flex;
      flex-direction: column;
    }
    .detail-value {
      font-size: 18px;
      font-weight: 700;
      color: #E4E6EB;
      line-height: 1.2;
    }
    .detail-label {
      font-size: 11px;
      color: #B0B3B8;
    }

    /* Revenue Section */
    .revenue-section {
      background: linear-gradient(135deg, rgba(0, 164, 0, 0.08), rgba(0, 164, 0, 0.03));
      border: 1px solid rgba(0, 164, 0, 0.2);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      margin-bottom: 16px;
    }
    .revenue-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-bottom: 8px;
    }
    .revenue-icon {
      font-size: 18px;
      color: #00A400;
    }
    .revenue-title {
      font-size: 12px;
      color: #B0B3B8;
      font-weight: 500;
    }
    .revenue-amount {
      font-size: 28px;
      font-weight: 800;
      color: #00A400;
      text-shadow: 0 0 10px rgba(0, 164, 0, 0.3);
    }
    .revenue-note {
      font-size: 10px;
      color: #65676B;
      display: block;
      margin-top: 4px;
    }
    .revenue-section.negative {
      background: linear-gradient(135deg, rgba(220, 53, 69, 0.08), rgba(220, 53, 69, 0.03));
      border-color: rgba(220, 53, 69, 0.2);
    }
    .revenue-section.negative .revenue-icon {
      color: #DC3545;
    }
    .revenue-section.negative .revenue-amount {
      color: #DC3545;
      text-shadow: 0 0 10px rgba(220, 53, 69, 0.3);
    }

    /* QR Section (Collapsible) */
    .qr-section {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      overflow: hidden;
      text-align: center;
    }
    .qr-header {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      background: transparent;
      border: none;
      cursor: pointer;
      transition: background 0.2s;
    }
    .qr-header:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    .qr-title {
      font-size: 12px;
      color: #B0B3B8;
      font-weight: 500;
    }
    .qr-toggle-icon {
      font-size: 18px;
      color: #B0B3B8;
      transition: transform 0.3s ease;
    }
    .qr-section.expanded .qr-toggle-icon {
      transform: rotate(180deg);
    }
    .qr-container {
      background: white;
      border-radius: 10px;
      padding: 8px;
      display: block;
      margin: 0 auto 16px;
      width: fit-content;
      animation: qrSlideDown 0.3s ease-out;
    }
    @keyframes qrSlideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .qr-image {
      width: 100%;
      max-width: 200px;
      border-radius: 6px;
      display: block;
    }

    /* Mobile Responsive */
    @media (max-width: 400px) {
      .profile-card {
        padding: 20px 16px;
        border-radius: 16px;
      }
      .avatar-container {
        width: 80px;
        height: 80px;
      }
      .avatar-placeholder {
        font-size: 32px;
      }
      .player-name {
        font-size: 20px;
      }
      .winrate-hero {
        flex-direction: column;
        text-align: center;
        gap: 16px;
        padding: 16px;
      }
      .winrate-circle {
        width: 90px;
        height: 90px;
      }
      .winrate-value {
        font-size: 24px;
      }
      .winrate-details {
        flex-direction: row;
        justify-content: center;
        gap: 24px;
      }
      .detail-item {
        flex-direction: column;
        text-align: center;
        gap: 4px;
      }
      .revenue-amount {
        font-size: 24px;
      }
    }

    /* Tablet */
    @media (min-width: 768px) {
      .profile-card {
        max-width: 400px;
        padding: 28px;
      }
      .avatar-container {
        width: 110px;
        height: 110px;
      }
      .player-name {
        font-size: 24px;
      }
      .winrate-circle {
        width: 110px;
        height: 110px;
      }
      .winrate-value {
        font-size: 28px;
      }
    }
  `],
})
export class PlayerProfilePopupComponent implements OnInit {
  @Input() playerId!: number;
  @Output() close = new EventEmitter<void>();

  private http = inject(HttpClient);

  profile = signal<PlayerProfile | null>(null);
  loading = signal(true);
  error = signal(false);
  qrExpanded = signal(false);

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.error.set(false);

    this.http.get<PlayerProfile>(`${environment.apiUrl}/user/profile/${this.playerId}`).subscribe({
      next: (data) => {
        this.profile.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  getRank(winCount: number): string {
    if (winCount >= 151) return 'diamond';
    if (winCount >= 61) return 'gold';
    if (winCount >= 26) return 'silver';
    if (winCount >= 11) return 'bronze';
    return 'iron';
  }

  getRankIcon(winCount: number): string {
    if (winCount >= 151) return '\u{1F48E}';  // 💎
    if (winCount >= 61) return '\u{1F451}';   // 👑
    if (winCount >= 26) return '\u{26A1}';    // ⚡
    if (winCount >= 11) return '\u{1F525}';   // 🔥
    return '\u{2694}\uFE0F';                  // ⚔️
  }

  getRankName(winCount: number): string {
    if (winCount >= 151) return 'Kim Cương';
    if (winCount >= 61) return 'Vàng';
    if (winCount >= 26) return 'Bạc';
    if (winCount >= 11) return 'Đồng';
    return 'Sắt';
  }

  getWinRateClass(winRate: number): string {
    if (winRate >= 60) return 'elite';
    if (winRate >= 40) return 'high';
    if (winRate >= 20) return 'medium';
    return 'low';
  }

  toggleQr(): void {
    this.qrExpanded.update(v => !v);
  }
}
