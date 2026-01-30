import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-winner-overlay',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <div class="overlay" (click)="dismissed.emit()">
      <div class="winner-card" (click)="$event.stopPropagation()">
        <div class="confetti-bg"></div>

        <div class="trophy">🏆</div>
        <h2>Chúc mừng người thắng!</h2>

        <div class="winner-avatar">
          @if (winner.avatarUrl) {
            <img [src]="winner.avatarUrl" [alt]="winner.displayName" />
          } @else {
            <span class="avatar-placeholder">{{ winner.displayName?.charAt(0) || '?' }}</span>
          }
        </div>

        <h3 class="winner-name">{{ winner.displayName }}</h3>

        @if (winner.winType) {
          <span class="win-type-badge">{{ getWinTypeLabel(winner.winType) }}</span>
        }

        @if (winner.qrCodeUrl) {
          <div class="qr-section">
            <p>Chuyển khoản cho người thắng:</p>
            <img [src]="winner.qrCodeUrl" alt="QR Code" class="qr-code" />
          </div>
        }

        @if (paymentAmount !== null && paymentAmount > 0) {
          <div class="payment-info">
            <span class="payment-label">Bạn cần trả:</span>
            <span class="payment-amount">{{ paymentAmount | number:'1.0-0' }}đ</span>
          </div>
        }

        <button class="dismiss-btn" (click)="dismissed.emit()">Đã hiểu</button>
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
      animation: fadeIn 0.3s;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .winner-card {
      background: #242526;
      border: 2px solid #FFD700;
      border-radius: 16px;
      padding: 32px;
      text-align: center;
      max-width: 420px;
      width: 90%;
      position: relative;
      animation: slideUp 0.5s ease-out;
      overflow: hidden;
    }
    @keyframes slideUp {
      from { transform: translateY(50px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .confetti-bg {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 20% 20%, rgba(255,215,0,0.1) 0%, transparent 50%),
                  radial-gradient(circle at 80% 80%, rgba(24,119,242,0.1) 0%, transparent 50%);
      pointer-events: none;
    }
    .trophy {
      font-size: 48px;
      margin-bottom: 8px;
    }
    h2 {
      color: #FFD700;
      margin: 0 0 20px;
      font-size: 20px;
    }
    .winner-avatar {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      margin: 0 auto 12px;
      border: 3px solid #FFD700;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #3A3B3C;
    }
    .winner-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .avatar-placeholder {
      font-size: 40px;
      color: #FFD700;
      font-weight: 700;
    }
    .winner-name {
      color: #E4E6EB;
      margin: 0 0 8px;
      font-size: 24px;
    }
    .win-type-badge {
      display: inline-block;
      background: rgba(255, 215, 0, 0.2);
      color: #FFD700;
      padding: 4px 16px;
      border-radius: 12px;
      font-size: 13px;
      margin-bottom: 16px;
    }
    .qr-section {
      margin: 16px 0;
    }
    .qr-section p {
      color: #B0B3B8;
      margin: 0 0 8px;
      font-size: 13px;
    }
    .qr-code {
      max-width: 220px;
      border-radius: 12px;
      border: 2px solid white;
    }
    .payment-info {
      background: rgba(250, 56, 62, 0.15);
      border: 1px solid #FA383E;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }
    .payment-label {
      display: block;
      color: #B0B3B8;
      font-size: 13px;
      margin-bottom: 4px;
    }
    .payment-amount {
      color: #FA383E;
      font-size: 32px;
      font-weight: 800;
    }
    .dismiss-btn {
      width: 100%;
      padding: 12px;
      background: #1877F2;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 15px;
      cursor: pointer;
      transition: background 0.2s;
      font-family: inherit;
      font-weight: 600;
    }
    .dismiss-btn:hover {
      background: #166FE5;
    }
  `],
})
export class WinnerOverlayComponent {
  @Input() winner: {
    displayName: string;
    avatarUrl: string | null;
    qrCodeUrl: string | null;
    winType?: string;
  } = { displayName: '', avatarUrl: null, qrCodeUrl: null };

  @Input() paymentAmount: number | null = null;

  @Output() dismissed = new EventEmitter<void>();

  getWinTypeLabel(type: string): string {
    switch (type) {
      case 'horizontal': return 'Hàng ngang';
      case 'vertical': return 'Hàng dọc';
      case 'diagonal': return 'Đường chéo';
      default: return type;
    }
  }
}
