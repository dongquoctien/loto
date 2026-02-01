import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KinhClaimOverlayItem } from '@loto/shared';

@Component({
  selector: 'app-kinh-claim-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="kinh-overlay-backdrop">
      <div class="kinh-overlay-card">
        @if (claims.length === 1) {
          <!-- Single claim -->
          <div class="kinh-header">HO KINH!</div>

          <div class="claimant-info">
            <div class="claimant-avatar">
              @if (claims[0].avatarUrl) {
                <img [src]="claims[0].avatarUrl" [alt]="claims[0].displayName" />
              } @else {
                <span>{{ claims[0].displayName?.charAt(0)?.toUpperCase() || '?' }}</span>
              }
            </div>
            <div class="claimant-name">{{ claims[0].displayName }}</div>
          </div>

          <div class="win-type-label">{{ getWinTypeLabel(claims[0].winType) }}</div>

          <div class="winning-numbers">
            @for (num of claims[0].winningNumbers; track num) {
              <span class="win-num">{{ num }}</span>
            }
          </div>
        } @else {
          <!-- Multiple claims -->
          <div class="kinh-header">{{ claims.length }} NGƯỜI HÔ KINH!</div>

          <div class="multi-claims">
            @for (claim of claims; track claim.userId) {
              <div class="claim-entry">
                <div class="claim-entry-top">
                  <div class="claim-avatar">
                    @if (claim.avatarUrl) {
                      <img [src]="claim.avatarUrl" [alt]="claim.displayName" />
                    } @else {
                      <span>{{ claim.displayName?.charAt(0)?.toUpperCase() || '?' }}</span>
                    }
                  </div>
                  <div class="claim-info">
                    <span class="claim-name">{{ claim.displayName }}</span>
                    <span class="claim-type">{{ getWinTypeLabel(claim.winType) }}</span>
                  </div>
                  <span class="claim-order">#{{ claim.claimOrder }}</span>
                </div>
                <div class="claim-numbers">
                  @for (num of claim.winningNumbers; track num) {
                    <span class="win-num-sm">{{ num }}</span>
                  }
                </div>
              </div>
            }
          </div>
        }

        <div class="waiting-text">
          <div class="waiting-spinner"></div>
          Đang đợi chủ phòng soát vé...
        </div>
      </div>
    </div>
  `,
  styles: [`
    .kinh-overlay-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease-out;
    }
    .kinh-overlay-card {
      background: linear-gradient(145deg, #242526, #1a1a1b);
      border: 2px solid #FF6B35;
      border-radius: 16px;
      padding: 28px 32px;
      text-align: center;
      max-width: 400px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 0 60px rgba(255, 107, 53, 0.3), 0 12px 40px rgba(0, 0, 0, 0.5);
      animation: scaleIn 0.3s ease-out;
    }
    .kinh-header {
      font-size: 28px;
      font-weight: 800;
      color: #FF6B35;
      text-transform: uppercase;
      letter-spacing: 4px;
      margin-bottom: 20px;
      text-shadow: 0 0 20px rgba(255, 107, 53, 0.5);
      animation: pulse 2s ease-in-out infinite;
    }
    .claimant-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }
    .claimant-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #3A3B3C;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border: 3px solid #FF6B35;
      box-shadow: 0 0 20px rgba(255, 107, 53, 0.3);
    }
    .claimant-avatar img {
      width: 100%; height: 100%; object-fit: cover;
    }
    .claimant-avatar span {
      color: #E4E6EB;
      font-size: 26px;
      font-weight: 700;
    }
    .claimant-name {
      font-size: 18px;
      font-weight: 700;
      color: #E4E6EB;
    }
    .win-type-label {
      font-size: 13px;
      color: #B0B3B8;
      margin-bottom: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .winning-numbers {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
      margin-bottom: 20px;
    }
    .win-num {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #FF6B35, #FF8F00);
      color: white;
      font-size: 16px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
    }

    /* Multi-claims */
    .multi-claims {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    }
    .claim-entry {
      background: rgba(255, 107, 53, 0.08);
      border: 1px solid rgba(255, 107, 53, 0.2);
      border-radius: 10px;
      padding: 12px;
    }
    .claim-entry-top {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    .claim-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #3A3B3C;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border: 2px solid #FF6B35;
      flex-shrink: 0;
    }
    .claim-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .claim-avatar span { color: #E4E6EB; font-size: 16px; font-weight: 700; }
    .claim-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      flex: 1;
      min-width: 0;
    }
    .claim-name {
      font-size: 14px;
      font-weight: 600;
      color: #E4E6EB;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }
    .claim-type { font-size: 11px; color: #B0B3B8; }
    .claim-order {
      font-size: 12px;
      font-weight: 700;
      color: #FF6B35;
      flex-shrink: 0;
    }
    .claim-numbers {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      justify-content: center;
    }
    .win-num-sm {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: linear-gradient(135deg, #FF6B35, #FF8F00);
      color: white;
      font-size: 12px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .waiting-text {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: #B0B3B8;
      font-size: 14px;
      padding-top: 8px;
      border-top: 1px solid #3A3B3C;
    }
    .waiting-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #3A3B3C;
      border-top-color: #FF6B35;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.85); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    @media (max-width: 420px) {
      .kinh-overlay-card { padding: 20px 16px; }
      .kinh-header { font-size: 22px; letter-spacing: 2px; }
      .claimant-avatar { width: 52px; height: 52px; }
      .claimant-name { font-size: 16px; }
      .win-num { width: 34px; height: 34px; font-size: 14px; }
      .win-num-sm { width: 26px; height: 26px; font-size: 11px; }
    }
  `],
})
export class KinhClaimOverlayComponent {
  @Input() claims: KinhClaimOverlayItem[] = [];

  getWinTypeLabel(type: string): string {
    switch (type) {
      case 'horizontal': return 'Kinh hàng ngang';
      case 'vertical': return 'Kinh hàng dọc';
      case 'diagonal': return 'Kinh đường chéo';
      default: return 'Kinh';
    }
  }
}
