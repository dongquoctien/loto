import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-game-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="controls-panel">
      <h3>🎮 Điều Khiển (Chủ Phòng)</h3>

      @switch (gameStatus) {
        @case ('preparing') {
          <div class="control-group">
            <p class="hint">Đợi người chơi mua tờ rồi bấm bắt đầu.</p>
            <button class="btn btn-start" (click)="startGame.emit()">
              ▶ Bắt Đầu Game
            </button>
          </div>
        }
        @case ('active') {
          <div class="control-group">
            @if (callMode === 'manual') {
              <button class="btn btn-call" (click)="callNumber.emit()">
                🔢 Kêu Số Tiếp
              </button>
            }
            <div class="auto-call-toggle">
              <label>
                <input type="checkbox"
                       [checked]="autoCallEnabled"
                       (change)="toggleAutoCall.emit(!autoCallEnabled)" />
                Auto kêu số ({{ autoCallInterval }}s)
              </label>
            </div>
            <div class="action-buttons">
              <button class="btn btn-pause" (click)="pauseGame.emit()">
                ⏸ Tạm Dừng
              </button>
              <button class="btn btn-reset-inline" (click)="resetGame.emit()">
                🔄 Làm Mới
              </button>
            </div>
          </div>
        }
        @case ('paused') {
          <div class="control-group">
            <div class="alert-box paused-box">
              ⏸ Game đang tạm dừng.
            </div>
            <div class="action-buttons">
              <button class="btn btn-resume" (click)="resumeGame.emit()">
                ▶ Tiếp Tục
              </button>
              <button class="btn btn-reset-inline" (click)="resetGame.emit()">
                🔄 Làm Mới
              </button>
            </div>
          </div>
        }
        @case ('paused_for_kinh') {
          <div class="control-group verify-group">
            <div class="alert-box">
              ⚠️ Có người hô KINH! Kiểm tra vé và quyết định.
            </div>

            @if (kinhClaimant) {
              <div class="claimant-info">
                <span class="claimant-name">{{ kinhClaimant.displayName }}</span>
                <span class="claimant-type">Loại: {{ getWinTypeLabel(kinhClaimant.winType) }}</span>
              </div>
            }

            <div class="verify-buttons">
              <button class="btn btn-approve" (click)="approveKinh.emit()">
                ✅ OK - Đúng
              </button>
              <button class="btn btn-reject" (click)="rejectKinh.emit()">
                ❌ Không Đúng
              </button>
            </div>
          </div>
        }
        @case ('finished') {
          <div class="control-group">
            <p class="hint">Ván đã kết thúc. Bắt đầu ván mới?</p>
            <button class="btn btn-reset" (click)="resetGame.emit()">
              🔄 Ván Mới
            </button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .controls-panel {
      background: #242526;
      padding: 16px;
      border-radius: 8px;
      margin-top: 16px;
      border: 1px solid #3A3B3C;
    }
    .controls-panel h3 {
      margin: 0 0 12px;
      font-size: 15px;
      color: #E4E6EB;
    }
    .control-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .hint { color: #B0B3B8; font-size: 13px; margin: 0; }
    .btn {
      padding: 12px 20px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 15px;
      font-weight: 600;
      transition: all 0.2s;
      font-family: inherit;
    }
    .btn:hover { filter: brightness(1.1); }
    .btn-start { background: #00A400; color: white; }
    .btn-call { background: #1877F2; color: white; }
    .btn-approve { background: #00A400; color: white; flex: 1; }
    .btn-reject { background: #FA383E; color: white; flex: 1; }
    .btn-reset { background: #F7B928; color: #1C1E21; }
    .btn-pause { background: #F7B928; color: #1C1E21; flex: 1; }
    .btn-resume { background: #00A400; color: white; flex: 1; }
    .btn-reset-inline { background: #65676B; color: white; flex: 1; }
    .action-buttons { display: flex; gap: 8px; margin-top: 4px; }
    .paused-box {
      background: rgba(247, 185, 40, 0.15);
      border: 1px solid #F7B928;
      color: #F7B928;
    }
    .auto-call-toggle {
      display: flex; align-items: center;
    }
    .auto-call-toggle label {
      display: flex; align-items: center; gap: 8px;
      color: #B0B3B8; font-size: 13px; cursor: pointer;
    }
    .auto-call-toggle input { cursor: pointer; }
    .alert-box {
      background: rgba(250, 56, 62, 0.15);
      border: 1px solid #FA383E;
      padding: 10px;
      border-radius: 8px;
      color: #FF6B6B;
      font-size: 14px;
    }
    .claimant-info {
      display: flex; justify-content: space-between; align-items: center;
      background: #3A3B3C;
      padding: 8px 12px; border-radius: 8px;
    }
    .claimant-name { font-weight: 600; color: #E4E6EB; }
    .claimant-type { color: #B0B3B8; font-size: 12px; }
    .verify-buttons { display: flex; gap: 8px; }
  `],
})
export class GameControlsComponent {
  @Input() gameStatus = 'preparing';
  @Input() callMode = 'auto';
  @Input() autoCallEnabled = false;
  @Input() autoCallInterval = 5;
  @Input() kinhClaimant: { displayName: string; winType: string } | null = null;

  @Output() startGame = new EventEmitter<void>();
  @Output() callNumber = new EventEmitter<void>();
  @Output() toggleAutoCall = new EventEmitter<boolean>();
  @Output() approveKinh = new EventEmitter<void>();
  @Output() rejectKinh = new EventEmitter<void>();
  @Output() resetGame = new EventEmitter<void>();
  @Output() pauseGame = new EventEmitter<void>();
  @Output() resumeGame = new EventEmitter<void>();

  getWinTypeLabel(type: string): string {
    switch (type) {
      case 'horizontal': return 'Hàng ngang';
      case 'vertical': return 'Hàng dọc';
      case 'diagonal': return 'Đường chéo';
      default: return type;
    }
  }
}
