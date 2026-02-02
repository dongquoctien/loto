import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, ViewChild, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

export interface PaymentReportItem {
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  sheetCount: number;
  amount: number;
}

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  width: number;
  height: number;
  color: string;
  opacity: number;
}

@Component({
  selector: 'app-winner-overlay',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <div class="overlay" (click)="dismissed.emit()">
      <!-- Confetti canvas behind the card -->
      <canvas #confettiCanvas class="confetti-canvas"></canvas>

      <div class="winner-card" (click)="$event.stopPropagation()">
        <!-- Animated sparkle bursts -->
        <div class="sparkle sparkle-1"></div>
        <div class="sparkle sparkle-2"></div>
        <div class="sparkle sparkle-3"></div>
        <div class="sparkle sparkle-4"></div>

        <!-- Glowing rings behind trophy -->
        <div class="glow-ring glow-ring-1"></div>
        <div class="glow-ring glow-ring-2"></div>

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

        @if (isWinner && paymentReport.length > 0) {
          <div class="payment-report">
            <div class="report-header">
              <h4>Danh sách thanh toán</h4>
              <button class="copy-btn" (click)="copyReport($event)">
                {{ copySuccess() ? '✓ Đã copy' : '📋 Copy' }}
              </button>
            </div>
            <div class="report-list">
              @for (item of paymentReport; track item.userId) {
                <div class="report-row">
                  <div class="report-player">
                    @if (item.avatarUrl) {
                      <img [src]="item.avatarUrl" class="report-avatar" />
                    } @else {
                      <span class="report-avatar-placeholder">{{ item.displayName?.charAt(0) || '?' }}</span>
                    }
                    <span class="report-name">{{ item.displayName }}</span>
                  </div>
                  <div class="report-details">
                    <span class="report-sheets">{{ item.sheetCount }} tờ</span>
                    <span class="report-amount">{{ item.amount | number:'1.0-0' }}đ</span>
                  </div>
                </div>
              }
            </div>
            <div class="report-total">
              <span>Tổng nhận:</span>
              <span class="total-amount">{{ totalWinAmount | number:'1.0-0' }}đ</span>
            </div>
          </div>
        }

        @if (!isWinner && winner.qrCodeUrl) {
          <div class="qr-section">
            <p>Chuyển khoản cho người thắng:</p>
            <img [src]="winner.qrCodeUrl" alt="QR Code" class="qr-code" />
          </div>
        }

        @if (!isWinner && paymentAmount !== null && paymentAmount > 0) {
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
      background: rgba(0, 0, 0, 0.88);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
      animation: overlayFadeIn 0.4s ease-out;
    }
    @keyframes overlayFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .confetti-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 0;
    }

    .winner-card {
      background: linear-gradient(170deg, #2C2D2E 0%, #1A1B1C 100%);
      border: 2px solid #FFD700;
      border-radius: 16px;
      padding: 20px 24px;
      text-align: center;
      max-width: 380px;
      width: 100%;
      max-height: calc(100vh - 32px);
      overflow-y: auto;
      position: relative;
      z-index: 1;
      animation: cardEntrance 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow:
        0 0 30px rgba(255, 215, 0, 0.2),
        0 0 60px rgba(255, 215, 0, 0.08),
        0 16px 48px rgba(0, 0, 0, 0.5);
    }
    /* Hide scrollbar but allow scroll */
    .winner-card::-webkit-scrollbar { width: 0; }
    .winner-card { scrollbar-width: none; }
    @keyframes cardEntrance {
      0% { transform: scale(0.3) translateY(60px); opacity: 0; }
      50% { opacity: 1; }
      100% { transform: scale(1) translateY(0); }
    }

    /* Sparkle bursts */
    .sparkle {
      position: absolute;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #FFD700;
      pointer-events: none;
      animation: sparkleBurst 2s ease-out infinite;
    }
    .sparkle-1 { top: 12%; left: 10%; animation-delay: 0s; }
    .sparkle-2 { top: 8%; right: 12%; animation-delay: 0.5s; }
    .sparkle-3 { bottom: 18%; left: 8%; animation-delay: 1s; }
    .sparkle-4 { bottom: 12%; right: 10%; animation-delay: 1.5s; }
    @keyframes sparkleBurst {
      0% { transform: scale(0); opacity: 1; box-shadow: 0 0 4px #FFD700, 0 0 8px #FFD700; }
      50% { transform: scale(2); opacity: 0.8; box-shadow: 0 0 8px #FFD700, 0 0 16px #FFA500; }
      100% { transform: scale(0); opacity: 0; box-shadow: none; }
    }

    /* Glowing rings behind trophy */
    .glow-ring {
      position: absolute;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      border-radius: 50%;
      border: 2px solid rgba(255, 215, 0, 0.25);
      pointer-events: none;
    }
    .glow-ring-1 {
      width: 64px; height: 64px;
      animation: ringPulse 2s ease-in-out infinite;
    }
    .glow-ring-2 {
      width: 90px; height: 90px; top: 0;
      animation: ringPulse 2s ease-in-out infinite 0.5s;
    }
    @keyframes ringPulse {
      0%, 100% { transform: translateX(-50%) scale(0.8); opacity: 0; }
      50% { transform: translateX(-50%) scale(1.2); opacity: 0.5; }
    }

    .trophy {
      font-size: 40px;
      margin-bottom: 2px;
      position: relative;
      z-index: 2;
      line-height: 1.2;
      animation: trophyBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both,
                 trophyGlow 2s ease-in-out infinite 1s;
      filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.5));
    }
    @keyframes trophyBounce {
      0% { transform: scale(0) rotate(-15deg); }
      60% { transform: scale(1.15) rotate(5deg); }
      100% { transform: scale(1) rotate(0deg); }
    }
    @keyframes trophyGlow {
      0%, 100% { filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.5)); }
      50% { filter: drop-shadow(0 0 16px rgba(255, 215, 0, 0.8)) drop-shadow(0 0 30px rgba(255, 165, 0, 0.3)); }
    }

    h2 {
      color: #FFD700;
      margin: 0 0 10px;
      font-size: 16px;
      font-weight: 700;
      text-shadow: 0 0 16px rgba(255, 215, 0, 0.3);
      animation: textReveal 0.5s ease-out 0.5s both;
    }
    @keyframes textReveal {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .winner-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      margin: 0 auto 8px;
      border: 2px solid #FFD700;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #3A3B3C;
      animation: avatarReveal 0.5s ease-out 0.6s both;
      box-shadow: 0 0 12px rgba(255, 215, 0, 0.25);
    }
    @keyframes avatarReveal {
      from { opacity: 0; transform: scale(0.5); }
      to { opacity: 1; transform: scale(1); }
    }
    .winner-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .avatar-placeholder {
      font-size: 26px;
      color: #FFD700;
      font-weight: 700;
    }

    .winner-name {
      color: #E4E6EB;
      margin: 0 0 4px;
      font-size: 18px;
      font-weight: 700;
      animation: textReveal 0.5s ease-out 0.7s both;
    }

    .win-type-badge {
      display: inline-block;
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 165, 0, 0.12));
      color: #FFD700;
      padding: 3px 14px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 12px;
      border: 1px solid rgba(255, 215, 0, 0.25);
      animation: textReveal 0.5s ease-out 0.8s both;
    }

    .qr-section {
      margin: 10px 0;
      animation: textReveal 0.5s ease-out 0.9s both;
    }
    .qr-section p {
      color: #B0B3B8;
      margin: 0 0 6px;
      font-size: 12px;
    }
    .qr-code {
      width: 100%;
      max-width: 260px;
      border-radius: 10px;
      border: 2px solid white;
    }

    .payment-info {
      background: rgba(250, 56, 62, 0.12);
      border: 1px solid #FA383E;
      border-radius: 8px;
      padding: 10px 14px;
      margin: 10px 0;
      animation: textReveal 0.5s ease-out 1s both;
    }
    .payment-label {
      display: block;
      color: #B0B3B8;
      font-size: 12px;
      margin-bottom: 2px;
    }
    .payment-amount {
      color: #FA383E;
      font-size: 24px;
      font-weight: 800;
    }

    /* Payment Report for Winner */
    .payment-report {
      margin: 10px 0;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 215, 0, 0.15);
      border-radius: 10px;
      overflow: hidden;
      animation: textReveal 0.5s ease-out 0.9s both;
      text-align: left;
    }
    .report-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .report-header h4 {
      margin: 0;
      color: #FFD700;
      font-size: 12px;
      font-weight: 600;
    }
    .copy-btn {
      background: rgba(255, 215, 0, 0.12);
      border: 1px solid rgba(255, 215, 0, 0.25);
      color: #FFD700;
      padding: 2px 10px;
      border-radius: 5px;
      font-size: 11px;
      cursor: pointer;
      font-family: inherit;
      font-weight: 600;
      transition: all 0.2s;
    }
    .copy-btn:hover { background: rgba(255, 215, 0, 0.2); }
    .report-list {
      max-height: 140px;
      overflow-y: auto;
    }
    .report-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    }
    .report-row:last-child { border-bottom: none; }
    .report-player {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1;
    }
    .report-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }
    .report-avatar-placeholder {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #3A3B3C;
      color: #B0B3B8;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
      flex-shrink: 0;
    }
    .report-name {
      color: #E4E6EB;
      font-size: 12px;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .report-details {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .report-sheets {
      color: #B0B3B8;
      font-size: 11px;
    }
    .report-amount {
      color: #00A400;
      font-size: 12px;
      font-weight: 700;
      min-width: 60px;
      text-align: right;
    }
    .report-total {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-top: 1px solid rgba(255, 215, 0, 0.15);
      background: rgba(255, 215, 0, 0.05);
    }
    .report-total span:first-child {
      color: #B0B3B8;
      font-size: 12px;
      font-weight: 600;
    }
    .total-amount {
      color: #FFD700;
      font-size: 16px;
      font-weight: 800;
    }

    .dismiss-btn {
      width: 100%;
      padding: 10px;
      background: linear-gradient(135deg, #1877F2, #1565D8);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
      font-weight: 600;
      margin-top: 4px;
      animation: textReveal 0.5s ease-out 1.1s both;
    }
    .dismiss-btn:hover {
      background: linear-gradient(135deg, #1565D8, #1254B5);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(24, 119, 242, 0.4);
    }

    /* Small phones */
    @media (max-height: 700px) {
      .winner-card { padding: 14px 16px; }
      .trophy { font-size: 32px; }
      h2 { font-size: 14px; margin-bottom: 6px; }
      .winner-avatar { width: 48px; height: 48px; }
      .avatar-placeholder { font-size: 20px; }
      .winner-name { font-size: 16px; }
      .qr-code { max-width: 200px; }
      .payment-amount { font-size: 20px; }
      .total-amount { font-size: 14px; }
      .report-list { max-height: 100px; }
      .dismiss-btn { padding: 8px; font-size: 13px; }
    }

    @media (max-width: 380px) {
      .winner-card { padding: 14px 12px; border-radius: 12px; }
      .glow-ring, .sparkle { display: none; }
    }
  `],
})
export class WinnerOverlayComponent implements OnInit, OnDestroy {
  @ViewChild('confettiCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() winner: {
    displayName: string;
    avatarUrl: string | null;
    qrCodeUrl: string | null;
    winType?: string;
  } = { displayName: '', avatarUrl: null, qrCodeUrl: null };

  @Input() paymentAmount: number | null = null;
  @Input() isWinner = false;
  @Input() paymentReport: PaymentReportItem[] = [];
  @Input() totalWinAmount = 0;

  @Output() dismissed = new EventEmitter<void>();

  copySuccess = signal(false);

  private particles: ConfettiParticle[] = [];
  private animFrameId = 0;
  private ctx: CanvasRenderingContext2D | null = null;

  private readonly confettiColors = [
    '#FFD700', '#FF6B35', '#1877F2', '#00A400',
    '#E94560', '#FF69B4', '#00D4FF', '#FFA500',
    '#9B59B6', '#2ECC71',
  ];

  ngOnInit() {
    this.initConfetti();
  }

  ngOnDestroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
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

  copyReport(event: Event) {
    event.stopPropagation();
    if (!this.paymentReport.length) return;

    const lines = ['🏆 KẾT QUẢ LÔ TÔ 🏆', ''];
    lines.push(`Người thắng: ${this.winner.displayName}`);
    if (this.winner.winType) {
      lines.push(`Kiểu thắng: ${this.getWinTypeLabel(this.winner.winType)}`);
    }
    lines.push('');
    lines.push('📋 Danh sách thanh toán:');
    lines.push('─────────────────');

    for (const item of this.paymentReport) {
      const amount = item.amount.toLocaleString('vi-VN');
      lines.push(`• ${item.displayName} — ${item.sheetCount} tờ — ${amount}đ`);
    }

    lines.push('─────────────────');
    const total = this.totalWinAmount.toLocaleString('vi-VN');
    lines.push(`💰 Tổng: ${total}đ`);

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    });
  }

  private initConfetti() {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;

    // Spawn initial burst
    this.spawnBurst(150);

    // Continue spawning smaller bursts
    const burstInterval = setInterval(() => this.spawnBurst(30), 800);
    setTimeout(() => clearInterval(burstInterval), 5000);

    this.animate();
  }

  private spawnBurst(count: number) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * window.innerWidth,
        y: -20 - Math.random() * 40,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 3 + 2,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        width: Math.random() * 8 + 4,
        height: Math.random() * 6 + 2,
        color: this.confettiColors[Math.floor(Math.random() * this.confettiColors.length)],
        opacity: 1,
      });
    }
  }

  private animate() {
    if (!this.ctx) return;
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04; // gravity
      p.vx *= 0.99; // air resistance
      p.rotation += p.rotationSpeed;

      // Fade out near bottom
      if (p.y > canvas.height * 0.75) {
        p.opacity -= 0.02;
      }

      if (p.opacity <= 0 || p.y > canvas.height + 20) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.globalAlpha = p.opacity;
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
      this.ctx.restore();
    }

    this.animFrameId = requestAnimationFrame(() => this.animate());
  }
}
