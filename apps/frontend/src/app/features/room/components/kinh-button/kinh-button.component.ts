import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { checkAllWins, TicketData as SharedTicketData, WinType, LineDetails } from '@loto/shared';

interface OwnedTicket {
  id: number;
  ticketNumber: number;
  colorGroup: string;
  rows: (number | null)[][];
}

interface DetectedWin {
  ticketId: number;
  ticketNumber: number;
  winType: WinType;
  lineDetails: LineDetails;
}

@Component({
  selector: 'app-kinh-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="kinh-wrapper">
      @if (getDetectedWins().length > 0) {
        <div class="win-detected-info">
          {{ getWinLabel(getDetectedWins()[0]) }}
        </div>
      }
      <button class="kinh-main-btn"
              [disabled]="disabled || getDetectedWins().length === 0"
              [class.has-win]="getDetectedWins().length > 0"
              (click)="onKinh()">
        KINH!
      </button>
      @if (getDetectedWins().length === 0 && !disabled) {
        <div class="no-win-hint">Chưa đủ điều kiện thắng</div>
      }
    </div>
  `,
  styles: [`
    .kinh-wrapper {
      text-align: center;
    }
    .win-detected-info {
      background: rgba(0, 164, 0, 0.15);
      border: 1px solid #00A400;
      border-radius: 8px;
      padding: 8px 12px;
      color: #00A400;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
      animation: pulse 1.5s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    .kinh-main-btn {
      width: 100%;
      padding: 20px;
      background: linear-gradient(135deg, #ff6b6b, #e94560);
      border: none;
      color: white;
      font-size: 28px;
      font-weight: 800;
      border-radius: 12px;
      cursor: pointer;
      letter-spacing: 6px;
      box-shadow: 0 4px 20px rgba(233, 69, 96, 0.5);
      transition: all 0.2s;
      font-family: inherit;
      text-transform: uppercase;
    }
    .kinh-main-btn.has-win {
      animation: glow 1.5s ease-in-out infinite;
    }
    @keyframes glow {
      0%, 100% { box-shadow: 0 4px 20px rgba(233, 69, 96, 0.5); }
      50% { box-shadow: 0 4px 40px rgba(233, 69, 96, 0.9), 0 0 60px rgba(233, 69, 96, 0.4); }
    }
    .kinh-main-btn:hover:not(:disabled) {
      transform: translateY(-3px);
      box-shadow: 0 8px 30px rgba(233, 69, 96, 0.6);
    }
    .kinh-main-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      animation: none;
    }
    .no-win-hint {
      color: #B0B3B8;
      font-size: 12px;
      margin-top: 6px;
    }
  `],
})
export class KinhButtonComponent {
  @Input() disabled = false;
  @Input() ownedTickets: OwnedTicket[] = [];
  @Input() calledNumbers: number[] = [];
  @Input() markedCells: Set<string> = new Set();
  @Input() winHorizontal = true;
  @Input() winVertical = false;
  @Input() winDiagonal = false;

  @Output() kinhClaimed = new EventEmitter<{
    ticketId: number;
    winType: string;
    lineDetails: { rowIndex?: number; colIndex?: number; direction?: string; startCol?: number };
  }>();

  /**
   * Build a set of numbers that are both called AND marked by the player for a specific ticket.
   * markedCells keys format: "ticketId:rowIndex:colIndex"
   */
  private getCalledAndMarkedNumbers(ticket: OwnedTicket): Set<number> {
    const calledSet = new Set(this.calledNumbers);
    const effectiveSet = new Set<number>();

    for (let r = 0; r < ticket.rows.length; r++) {
      for (let c = 0; c < ticket.rows[r].length; c++) {
        const num = ticket.rows[r][c];
        if (num === null || num === 0) continue;

        const key = `${ticket.id}:${r}:${c}`;
        if (calledSet.has(num) && this.markedCells.has(key)) {
          effectiveSet.add(num);
        }
      }
    }

    return effectiveSet;
  }

  getDetectedWins(): DetectedWin[] {
    if (!this.calledNumbers.length || !this.ownedTickets.length) return [];

    const enabledTypes = {
      horizontal: this.winHorizontal,
      vertical: this.winVertical,
      diagonal: this.winDiagonal,
    };

    const wins: DetectedWin[] = [];

    for (const ticket of this.ownedTickets) {
      const sharedTicket: SharedTicketData = {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        colorGroup: ticket.colorGroup as SharedTicketData['colorGroup'],
        rows: ticket.rows as SharedTicketData['rows'],
      };

      // Use intersection of called + marked numbers instead of just called
      const effectiveNumbers = this.getCalledAndMarkedNumbers(ticket);
      const result = checkAllWins(sharedTicket, effectiveNumbers, enabledTypes);
      if (result.hasWin) {
        for (const win of result.wins) {
          wins.push({
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            winType: win.winType,
            lineDetails: win.lineDetails,
          });
        }
      }
    }

    return wins;
  }

  getWinLabel(win: DetectedWin): string {
    const typeLabels: Record<string, string> = {
      horizontal: 'Hàng ngang',
      vertical: 'Hàng dọc',
      diagonal: 'Đường chéo',
    };
    return `Vé #${win.ticketNumber} - ${typeLabels[win.winType] || win.winType}`;
  }

  onKinh() {
    const wins = this.getDetectedWins();
    if (wins.length === 0) return;

    const firstWin = wins[0];
    this.kinhClaimed.emit({
      ticketId: firstWin.ticketId,
      winType: firstWin.winType,
      lineDetails: firstWin.lineDetails,
    });
  }
}
