import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Player {
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
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
            <span class="player-name">{{ mePlayer.displayName }} (Bạn) @if (mePlayer.winCount > 0) { <span class="win-count-badge">🏆 {{ mePlayer.winCount }}</span> }</span>
            <div class="player-badges">
              @if (mePlayer.userId === ownerId) {
                <span class="owner-badge">Chủ phòng</span>
              }
              @if (penalizedPlayers.has(mePlayer.userId)) {
                <span class="penalty-badge">Phạt</span>
              }
              @if (kinhClaimantId === mePlayer.userId) {
                <span class="kinh-claim-badge">KINH - Đang Soát vé</span>
              } @else if (nearWinPlayers.has(mePlayer.userId)) {
                <span class="near-win-badge">Đang đợi</span>
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
              @if (player.winCount > 0) { <span class="win-count-badge">🏆 {{ player.winCount }}</span> }
            </span>
            <div class="player-badges">
            
              @if (player.userId === ownerId) {
                <span class="owner-badge">Chủ phòng</span>
              }
              @if (penalizedPlayers.has(player.userId)) {
                <span class="penalty-badge">Phạt</span>
              }
              @if (kinhClaimantId === player.userId) {
                <span class="kinh-claim-badge">KINH - Đang soát vé</span>
              } @else if (nearWinPlayers.has(player.userId)) {
                <span class="near-win-badge">Đang đợi</span>
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
    .player-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      align-items: center;
    }
    .win-count-badge {
      font-size: 10px;
      color: #FFD700;
      font-weight: 700;
      background: rgba(255, 215, 0, 0.12);
      padding: 1px 6px;
      border-radius: 8px;
      border: 1px solid rgba(255, 215, 0, 0.25);
    }
    .player-separator {
      border-bottom: 1px solid #3A3B3C;
      margin: 6px 0;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.2; }
    }
  `],
})
export class PlayerListComponent {
  @Input() players: Player[] = [];
  @Input() ownerId: number | null = null;
  @Input() currentUserId: number | null = null;
  @Input() penalizedPlayers: Set<number> = new Set();
  @Input() nearWinPlayers: Set<number> = new Set();
  @Input() kinhClaimantId: number | null = null;

  get mePlayer(): Player | undefined {
    return this.players.find(p => p.userId === this.currentUserId);
  }

  get otherPlayers(): Player[] {
    return this.players.filter(p => p.userId !== this.currentUserId);
  }
}
