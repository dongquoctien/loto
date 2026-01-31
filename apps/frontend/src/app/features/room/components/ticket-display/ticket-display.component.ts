import { Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface TicketData {
  id: number;
  ticketNumber: number;
  colorGroup: string;
  rows: (number | null)[][];
}

interface MarkedCellKey {
  ticketId: number;
  rowIndex: number;
  colIndex: number;
}

const COLOR_HEX: Record<string, { bg: string; border: string; header: string }> = {
  orange: { bg: '#FFF3E0', border: '#FF8C00', header: '#FF8C00' },
  yellow: { bg: '#FFFDE7', border: '#DAA520', header: '#DAA520' },
  purple: { bg: '#F3E5F5', border: '#7B68EE', header: '#7B68EE' },
  pink: { bg: '#FCE4EC', border: '#FF69B4', header: '#FF69B4' },
  blue: { bg: '#E3F2FD', border: '#4169E1', header: '#4169E1' },
  green: { bg: '#E8F5E9', border: '#3CB371', header: '#3CB371' },
  lime: { bg: '#F1F8E9', border: '#9ACD32', header: '#9ACD32' },
  red: { bg: '#FFEBEE', border: '#DC143C', header: '#DC143C' },
  teal: { bg: '#E0F2F1', border: '#008080', header: '#008080' },
  brown: { bg: '#EFEBE9', border: '#8B4513', header: '#8B4513' },
};

@Component({
  selector: 'app-ticket-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ticket"
         [style.border-color]="colorInfo.border"
         [style.background-color]="colorInfo.bg">
      <div class="ticket-header" [style.background-color]="colorInfo.header">
        <span class="ticket-number">Vé #{{ ticket.ticketNumber }}</span>
      </div>
      <table class="ticket-grid">
        @for (row of ticket.rows; track rowIdx; let rowIdx = $index) {
          <tr>
            @for (cell of row; track colIdx; let colIdx = $index) {
              <td class="ticket-cell"
                  [class.empty]="cell === null"
                  [class.has-number]="cell !== null"
                  [class.marked]="isCellMarked(rowIdx, colIdx)"
                  [class.called]="cell !== null && isNumberCalled(cell)"
                  [class.highlight-win]="isCellInWinLine(rowIdx, colIdx)"
                  (click)="onCellClick(rowIdx, colIdx, cell)">
                @if (cell !== null) {
                  <span class="cell-number">{{ cell }}</span>
                  @if (isCellMarked(rowIdx, colIdx)) {
                    <span class="mark-indicator">✓</span>
                  }
                }
              </td>
            }
          </tr>
        }
      </table>
    </div>
  `,
  styles: [`
    .ticket {
      border: 3px solid;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      transition: transform 0.2s;
    }
    .ticket:hover { transform: translateY(-2px); }
    .ticket-header {
      color: white;
      padding: 6px 12px;
      font-weight: 700;
      font-size: 13px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .ticket-grid {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .ticket-cell {
      width: 11.11%;
      height: 44px;
      text-align: center;
      vertical-align: middle;
      border: 1px solid rgba(0,0,0,0.1);
      cursor: pointer;
      position: relative;
      transition: all 0.15s;
      user-select: none;
    }
    .ticket-cell.empty {
      background: rgba(0,0,0,0.03);
      cursor: default;
    }
    .ticket-cell.has-number:hover {
      background: rgba(0,0,0,0.08);
    }
    .ticket-cell.called {
      background: rgba(24, 119, 242, 0.15);
    }
    .ticket-cell.marked {
      background: #1877F2 !important;
      color: white;
    }
    .ticket-cell.marked .cell-number {
      color: white;
      font-weight: 700;
    }
    .ticket-cell.highlight-win {
      background: #FFD700 !important;
      animation: winPulse 0.8s infinite alternate;
    }
    @keyframes winPulse {
      from { box-shadow: inset 0 0 0 2px #FFD700; }
      to { box-shadow: inset 0 0 0 4px #FF6B00; }
    }
    .cell-number {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
    .mark-indicator {
      position: absolute;
      top: 2px;
      right: 3px;
      font-size: 10px;
      color: white;
    }
  `],
})
export class TicketDisplayComponent {
  @Input() ticket!: TicketData;
  @Input() calledNumbers: number[] = [];
  @Input() markedCells: Set<string> = new Set();
  @Input() interactive = true;
  @Input() winHighlightCells: Set<string> = new Set();

  @Output() cellClicked = new EventEmitter<{ ticketId: number; rowIndex: number; colIndex: number; number: number }>();
  @Output() numberLookup = new EventEmitter<number>();

  get colorInfo() {
    return COLOR_HEX[this.ticket.colorGroup] || COLOR_HEX['blue'];
  }

  isNumberCalled(num: number): boolean {
    return this.calledNumbers.includes(num);
  }

  isCellMarked(rowIdx: number, colIdx: number): boolean {
    return this.markedCells.has(`${this.ticket.id}:${rowIdx}:${colIdx}`);
  }

  isCellInWinLine(rowIdx: number, colIdx: number): boolean {
    return this.winHighlightCells.has(`${this.ticket.id}:${rowIdx}:${colIdx}`);
  }

  onCellClick(rowIdx: number, colIdx: number, cellValue: number | null) {
    if (cellValue === null) return;

    // Always emit numberLookup for lookup/scroll in header
    this.numberLookup.emit(cellValue);

    if (!this.interactive) return;
    if (!this.isNumberCalled(cellValue)) return;

    this.cellClicked.emit({
      ticketId: this.ticket.id,
      rowIndex: rowIdx,
      colIndex: colIdx,
      number: cellValue,
    });
  }
}
