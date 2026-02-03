import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Player {
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
  isReady: boolean;
  winCount: number;
}

@Component({
  selector: 'app-player-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="player-sidebar">
      <h3>Người Chơi ({{ players.length }})</h3>

      <!-- Current user (me) at top -->
      @if (mePlayer) {
        <div class="player-item is-me" [class.offline]="!mePlayer.isOnline">
          <div class="player-avatar me-avatar">
            @if (mePlayer.avatarUrl) {
              <img [src]="mePlayer.avatarUrl" [alt]="mePlayer.displayName" />
            } @else {
              <span>{{ mePlayer.displayName?.charAt(0) || '?' }}</span>
            }
            <span class="status-dot" [class.online]="mePlayer.isOnline"></span>
          </div>
          <div class="player-info">
            <span class="player-name">{{ mePlayer.displayName }} (Bạn) @if (mePlayer.winCount > 0) { <span class="win-count-badge" [ngClass]="'rank-' + getRank(mePlayer.winCount)">{{ getRankIcon(mePlayer.winCount) }} {{ mePlayer.winCount }}</span> }</span>
            <div class="player-badges">
              @if (mePlayer.userId === ownerId) {
                <span class="owner-badge">Chủ phòng</span>
              }
              @if (mePlayer.isReady && roomStatus === 'waiting' && mePlayer.userId !== ownerId) {
                <span class="ready-badge">SẴN SÀNG</span>
              }
              @if (penalizedPlayers.has(mePlayer.userId)) {
                <span class="penalty-badge">Phạt</span>
              }
              @if (kinhClaimantIds.includes(mePlayer.userId)) {
                <span class="kinh-claim-badge">KINH - Đang soát vé</span>
              } @else if (nearWinPlayers.has(mePlayer.userId)) {
                <span class="near-win-badge">Đang đợi x{{ nearWinPlayers.get(mePlayer.userId) }}</span>
              }
            </div>
          </div>
        </div>
        <div class="player-separator"></div>
      }

      <!-- Other players -->
      @for (player of otherPlayers; track player.userId) {
        <div class="player-item" [class.offline]="!player.isOnline">
          <div class="player-avatar">
            @if (player.avatarUrl) {
              <img [src]="player.avatarUrl" [alt]="player.displayName" />
            } @else {
              <span>{{ player.displayName?.charAt(0) || '?' }}</span>
            }
            <span class="status-dot" [class.online]="player.isOnline"></span>
          </div>
          <div class="player-info">
            <span class="player-name">{{ player.displayName }}
              @if (player.winCount > 0) { <span class="win-count-badge" [ngClass]="'rank-' + getRank(player.winCount)">{{ getRankIcon(player.winCount) }} {{ player.winCount }}</span> }
            </span>
            <div class="player-badges">
              @if (player.userId === ownerId) {
                <span class="owner-badge">Chủ phòng</span>
              }
              @if (player.isReady && roomStatus === 'waiting' && player.userId !== ownerId) {
                <span class="ready-badge">SẴN SÀNG</span>
              }
              @if (penalizedPlayers.has(player.userId)) {
                <span class="penalty-badge">Phạt</span>
              }
              @if (kinhClaimantIds.includes(player.userId)) {
                <span class="kinh-claim-badge">KINH - Đang soát vé</span>
              } @else if (nearWinPlayers.has(player.userId)) {
                <span class="near-win-badge">Đang đợi x{{ nearWinPlayers.get(player.userId) }}</span>
              }
            </div>
          </div>
        </div>
      }
    </aside>
  `,
  styles: [`
    .player-sidebar {
      width: 200px;
      background: #242526;
      padding: 16px;
      border-left: 1px solid #3A3B3C;
      overflow-y: auto;
    }
    h3 {
      margin: 0 0 12px;
      font-size: 13px;
      color: #B0B3B8;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .player-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 6px;
      border-radius: 8px;
      transition: background 0.15s;
    }
    .player-item:hover { background: #3A3B3C; }
    .player-item.offline { opacity: 0.45; }
    .player-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #3A3B3C;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      flex-shrink: 0;
    }
    .player-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
    .player-avatar span:not(.status-dot) { color: #B0B3B8; font-size: 14px; font-weight: 600; }
    .status-dot {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #65676B;
      border: 2px solid #242526;
    }
    .status-dot.online { background: #31A24C; }
    .me-avatar { box-shadow: 0 0 0 2px #1877F2; }
    .player-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .player-name {
      font-size: 13px;
      color: #E4E6EB;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 17px;
    }
    .owner-badge {
      font-size: 10px;
      color: #1877F2;
      font-weight: 600;
    }
    .penalty-badge {
      font-size: 10px;
      color: #FA383E;
      font-weight: 600;
    }
    .near-win-badge {
      font-size: 10px;
      color: #FFD700;
      font-weight: 600;
      animation: blink 1s ease-in-out infinite;
    }
    .kinh-claim-badge {
      font-size: 10px;
      color: #FF6B35;
      font-weight: 600;
      animation: blink 1s ease-in-out infinite;
    }
    .ready-badge {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 1px;
      color: #FFD700;
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 165, 0, 0.1));
      border: 1px solid rgba(255, 215, 0, 0.5);
      padding: 2px 6px;
      border-radius: 4px;
      text-shadow: 0 0 8px rgba(255, 215, 0, 0.8), 0 0 16px rgba(255, 165, 0, 0.4);
      box-shadow: 0 0 6px rgba(255, 215, 0, 0.3), inset 0 0 4px rgba(255, 215, 0, 0.1);
      animation: readyPulse 1.5s ease-in-out infinite;
    }
    @keyframes readyPulse {
      0%, 100% {
        text-shadow: 0 0 8px rgba(255, 215, 0, 0.8), 0 0 16px rgba(255, 165, 0, 0.4);
        box-shadow: 0 0 6px rgba(255, 215, 0, 0.3), inset 0 0 4px rgba(255, 215, 0, 0.1);
        border-color: rgba(255, 215, 0, 0.5);
      }
      50% {
        text-shadow: 0 0 12px rgba(255, 215, 0, 1), 0 0 24px rgba(255, 165, 0, 0.6);
        box-shadow: 0 0 12px rgba(255, 215, 0, 0.5), inset 0 0 6px rgba(255, 215, 0, 0.2);
        border-color: rgba(255, 215, 0, 0.8);
      }
    }
    .player-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      align-items: center;
    }
    .win-count-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      gap: 1px;
      vertical-align: middle;
    }
    .rank-iron {
      color: #8A8A8A;
      background: rgba(138, 138, 138, 0.12);
      border: 1px solid rgba(138, 138, 138, 0.25);
    }
    .rank-bronze {
      color: #CD7F32;
      background: rgba(205, 127, 50, 0.12);
      border: 1px solid rgba(205, 127, 50, 0.25);
    }
    .rank-silver {
      color: #C0C0C0;
      background: rgba(192, 192, 192, 0.15);
      border: 1px solid rgba(192, 192, 192, 0.30);
    }
    .rank-gold {
      color: #FFD700;
      background: rgba(255, 215, 0, 0.12);
      border: 1px solid rgba(255, 215, 0, 0.25);
    }
    .rank-diamond {
      color: #B9F2FF;
      background: linear-gradient(135deg, rgba(185, 242, 255, 0.15), rgba(100, 200, 255, 0.08));
      border: 1px solid rgba(185, 242, 255, 0.35);
      text-shadow: 0 0 6px rgba(185, 242, 255, 0.6);
      animation: diamondShimmer 2s ease-in-out infinite;
    }
    @keyframes diamondShimmer {
      0%, 100% { border-color: rgba(185, 242, 255, 0.35); }
      50% { border-color: rgba(185, 242, 255, 0.7); box-shadow: 0 0 6px rgba(185, 242, 255, 0.25); }
    }
    .player-separator {
      border-bottom: 1px solid #3A3B3C;
      margin: 6px 0;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.2; }
    }
    @media (max-width: 768px) {
      .player-sidebar {
        width: 100%;
        border-left: none;
      }
    }
  `],
})
export class PlayerListComponent {
  @Input() players: Player[] = [];
  @Input() ownerId: number | null = null;
  @Input() currentUserId: number | null = null;
  @Input() penalizedPlayers: Set<number> = new Set();
  @Input() nearWinPlayers: Map<number, number> = new Map();
  @Input() kinhClaimantIds: number[] = [];
  @Input() roomStatus: 'waiting' | 'playing' = 'waiting';

  get mePlayer(): Player | undefined {
    return this.players.find(p => p.userId === this.currentUserId);
  }

  get otherPlayers(): Player[] {
    return this.players.filter(p => p.userId !== this.currentUserId);
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
}
