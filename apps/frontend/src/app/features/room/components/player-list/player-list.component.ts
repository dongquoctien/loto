import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Player {
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
}

@Component({
  selector: 'app-player-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="player-sidebar">
      <h3>Người Chơi ({{ players.length }})</h3>
      @for (player of players; track player.userId) {
        <div class="player-item" [class.offline]="!player.isOnline" [class.is-me]="player.userId === currentUserId">
          <div class="player-avatar" [class.me-avatar]="player.userId === currentUserId">
            @if (player.avatarUrl) {
              <img [src]="player.avatarUrl" [alt]="player.displayName" />
            } @else {
              <span>{{ player.displayName?.charAt(0) || '?' }}</span>
            }
            <span class="status-dot" [class.online]="player.isOnline"></span>
          </div>
          <div class="player-info">
            <span class="player-name">{{ player.displayName }}</span>
            @if (player.userId === ownerId) {
              <span class="owner-badge">Chủ phòng</span>
            }
            @if (penalizedPlayers.has(player.userId)) {
              <span class="penalty-badge">Phạt</span>
            }
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
  `],
})
export class PlayerListComponent {
  @Input() players: Player[] = [];
  @Input() ownerId: number | null = null;
  @Input() currentUserId: number | null = null;
  @Input() penalizedPlayers: Set<number> = new Set();
}
