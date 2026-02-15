import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

interface TicketData {
  id: number;
  ticketNumber: number;
  colorGroup: string;
  rows: (number | null)[][];
}

interface SheetData {
  id: number;
  sheetNumber: number;
  colorGroup: string;
  tickets: TicketData[];
}

const COLOR_HEX: Record<string, { bg: string; border: string; cellBg: string; cellBorder: string }> = {
  orange: { bg: '#FF8C00', border: '#E67E00', cellBg: '#FFB74D', cellBorder: '#FF8C00' },
  yellow: { bg: '#DAA520', border: '#C89A1E', cellBg: '#FFE082', cellBorder: '#DAA520' },
  purple: { bg: '#7B68EE', border: '#6A5ACD', cellBg: '#B39DDB', cellBorder: '#7B68EE' },
  pink: { bg: '#FF69B4', border: '#E05AA0', cellBg: '#F8BBD9', cellBorder: '#FF69B4' },
  blue: { bg: '#4169E1', border: '#3558C0', cellBg: '#90CAF9', cellBorder: '#4169E1' },
  green: { bg: '#3CB371', border: '#339E63', cellBg: '#A5D6A7', cellBorder: '#3CB371' },
  lime: { bg: '#9ACD32', border: '#8AB92E', cellBg: '#C5E1A5', cellBorder: '#9ACD32' },
  red: { bg: '#DC143C', border: '#C01234', cellBg: '#EF9A9A', cellBorder: '#DC143C' },
};

@Component({
  selector: 'app-sheet-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sheet" [style.border-color]="colorInfo.border">
      <!-- Sheet Header -->
      <div class="sheet-header" [style.background]="headerGradient">
        <span class="sheet-title">LÔ TÔ {{ ownerName.toUpperCase() }}</span>
      </div>

      <!-- 3 Tickets stacked -->
      <div class="sheet-body">
        @for (ticket of sheet.tickets; track ticket.id; let ticketIdx = $index) {
          <div class="ticket-section">
            <span class="ticket-number-badge" [style.background-color]="colorInfo.bg">{{ ticket.ticketNumber }}</span>
            <table class="ticket-grid">
              @for (row of ticket.rows; track rowIdx; let rowIdx = $index) {
                <tr>
                  @for (cell of row; track colIdx; let colIdx = $index) {
                    <td class="cell"
                        [class.has-number]="cell !== null"
                        [class.empty]="cell === null"
                        [class.called]="cell !== null && isNumberCalled(cell)"
                        [class.marked]="isCellMarked(ticket.id, rowIdx, colIdx)"
                        [class.highlight-win]="isCellInWinLine(ticket.id, rowIdx, colIdx)"
                        [style.--cell-bg]="colorInfo.cellBg"
                        [style.--cell-border]="colorInfo.cellBorder"
                        (click)="onCellClick(ticket.id, rowIdx, colIdx, cell)">
                      @if (cell !== null) {
                        <span class="cell-num">{{ cell }}</span>
                        @if (isCellMarked(ticket.id, rowIdx, colIdx)) {
                          <span class="mark-check">✓</span>
                        }
                      }
                    </td>
                  }
                </tr>
              }
            </table>
          </div>
          @if (ticketIdx < sheet.tickets.length - 1) {
            <div class="ticket-divider" [style.--divider-color]="colorInfo.bg"></div>
          }
        }
      </div>

      <!-- Sheet Footer -->
      <div class="sheet-footer" [style.background]="footerGradient">
        <span class="sheet-number">Tờ #{{ sheet.sheetNumber }}</span>
      </div>
    </div>
  `,
  styles: [`
    .sheet {
      background: #fff;
      border: 3px solid;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 655px;
    }

    .sheet-header {
      padding: 10px 16px;
      text-align: center;
    }
    .sheet-title {
      color: white;
      font-size: 16px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 2px;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
    }

    .sheet-body {
      padding: 8px;
      background: #fff;
    }

    .ticket-section {
      position: relative;
      padding-left: 28px;
    }
    .ticket-number-badge {
      position: absolute;
      left: 4px;
      top: 50%;
      transform: translateY(-50%);
      color: white;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      z-index: 1;
    }

    .ticket-grid {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    .cell {
      height: 32px;
      text-align: center;
      vertical-align: middle;
      border: 1px solid #ddd;
      position: relative;
      cursor: pointer;
      transition: all 0.15s;
      user-select: none;
    }

    .cell.has-number {
      background: var(--cell-bg);
      border-color: var(--cell-border);
    }
    .cell.empty {
      background: #fff;
      cursor: default;
    }
    .cell.has-number:hover {
      filter: brightness(1.1);
    }

    .cell.called {
      box-shadow: inset 0 0 0 2px var(--cell-border);
    }

    .cell.marked {
      background: #1877F2 !important;
      border-color: #1565C0 !important;
    }
    .cell.marked .cell-num {
      color: white;
    }
    .cell.marked .mark-check {
      color: white;
    }

    .cell.highlight-win {
      background: #FFD700 !important;
      animation: winPulse 0.8s infinite alternate;
    }
    @keyframes winPulse {
      from { box-shadow: inset 0 0 0 2px #FFD700; }
      to { box-shadow: inset 0 0 0 4px #FF6B00; }
    }

    .cell-num {
      font-size: 14px;
      font-weight: 700;
      color: #333;
    }

    .mark-check {
      position: absolute;
      top: 1px;
      right: 2px;
      font-size: 9px;
      color: #1877F2;
    }

    .ticket-divider {
      height: 2px;
      background: linear-gradient(90deg, transparent 0%, var(--divider-color) 20%, var(--divider-color) 80%, transparent 100%);
      margin: 6px 28px 6px 28px;
    }

    .sheet-footer {
      padding: 6px 16px;
      text-align: center;
    }
    .sheet-number {
      color: white;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* Responsive */
    @media (max-width: 480px) {
      .sheet-header { padding: 8px 12px; }
      .sheet-title { font-size: 13px; letter-spacing: 1px; }
      .sheet-body { padding: 6px; }
      .ticket-section { padding-left: 24px; }
      .ticket-number-badge { width: 18px; height: 18px; font-size: 10px; }
      .cell { height: 28px; }
      .cell-num { font-size: 12px; }
      .ticket-divider { margin: 4px 24px; }
      .sheet-footer { padding: 5px 12px; }
      .sheet-number { font-size: 11px; }
    }

    @media (max-width: 360px) {
      .sheet-header { padding: 6px 8px; }
      .sheet-title { font-size: 11px; letter-spacing: 0.5px; }
      .sheet-body { padding: 4px; }
      .ticket-section { padding-left: 20px; }
      .ticket-number-badge { width: 16px; height: 16px; font-size: 9px; left: 2px; }
      .cell { height: 24px; }
      .cell-num { font-size: 11px; }
      .mark-check { font-size: 8px; top: 0; right: 1px; }
      .ticket-divider { margin: 3px 20px; }
      .sheet-footer { padding: 4px 8px; }
      .sheet-number { font-size: 10px; }
    }
  `]
})
export class SheetDisplayComponent {
  @Input() sheet!: SheetData;
  @Input() ownerName: string = '';
  @Input() calledNumbers: number[] = [];
  @Input() markedCells: Set<string> = new Set();
  @Input() interactive = true;
  @Input() winHighlightCells: Set<string> = new Set();

  @Output() cellClicked = new EventEmitter<{ ticketId: number; rowIndex: number; colIndex: number; number: number }>();

  get colorInfo() {
    return COLOR_HEX[this.sheet.colorGroup] || COLOR_HEX['orange'];
  }

  get headerGradient(): string {
    const c = this.colorInfo;
    return `linear-gradient(135deg, ${c.bg} 0%, ${c.border} 100%)`;
  }

  get footerGradient(): string {
    const c = this.colorInfo;
    return `linear-gradient(135deg, ${c.border} 0%, ${c.bg} 100%)`;
  }

  isNumberCalled(num: number): boolean {
    return this.calledNumbers.includes(num);
  }

  isCellMarked(ticketId: number, rowIdx: number, colIdx: number): boolean {
    return this.markedCells.has(`${ticketId}:${rowIdx}:${colIdx}`);
  }

  isCellInWinLine(ticketId: number, rowIdx: number, colIdx: number): boolean {
    return this.winHighlightCells.has(`${ticketId}:${rowIdx}:${colIdx}`);
  }

  onCellClick(ticketId: number, rowIdx: number, colIdx: number, cellValue: number | null) {
    if (cellValue === null) return;
    if (!this.interactive) return;
    if (!this.isNumberCalled(cellValue)) return;

    this.cellClicked.emit({
      ticketId,
      rowIndex: rowIdx,
      colIndex: colIdx,
      number: cellValue,
    });
  }
}
