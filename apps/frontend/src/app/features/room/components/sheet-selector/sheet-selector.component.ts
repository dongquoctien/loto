import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  iconoirNavArrowUp,
  iconoirNavArrowDown,
  iconoirCart,
  iconoirUndo,
} from '@ng-icons/iconoir';


interface SheetInfo {
  id: number;
  sheetNumber: number;
  colorGroup: string;
  tickets: { id: number; ticketNumber: number; colorGroup: string; rows: (number | null)[][] }[];
}

interface Player {
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
}

const COLOR_HEX: Record<string, { bg: string; border: string; text: string; nameVi: string }> = {
  orange: { bg: '#FF8C00', border: '#E67E00', text: '#fff', nameVi: 'Cam' },
  yellow: { bg: '#DAA520', border: '#C89A1E', text: '#fff', nameVi: 'Vàng' },
  purple: { bg: '#7B68EE', border: '#6A5ACD', text: '#fff', nameVi: 'Tím' },
  pink: { bg: '#FF69B4', border: '#E05AA0', text: '#fff', nameVi: 'Hồng' },
  blue: { bg: '#4169E1', border: '#3558C0', text: '#fff', nameVi: 'Xanh dương' },
  green: { bg: '#3CB371', border: '#339E63', text: '#fff', nameVi: 'Xanh lá' },
  lime: { bg: '#9ACD32', border: '#8AB92E', text: '#fff', nameVi: 'Xanh non' },
  red: { bg: '#DC143C', border: '#C01234', text: '#fff', nameVi: 'Đỏ' },
};

@Component({
  selector: 'app-sheet-selector',
  standalone: true,
  imports: [CommonModule, NgIcon],
  viewProviders: [
    provideIcons({
      iconoirNavArrowUp,
      iconoirNavArrowDown,
      iconoirCart,
      iconoirUndo,
    }),
  ],
  template: `
    <div class="sheet-selector">
      <h3>Chọn Tờ Vé</h3>
      <div class="sheets-grid">
        @for (sheet of sheets; track sheet.id) {
          @let color = getColor(sheet.colorGroup);
          @let taken = isTaken(sheet.id);
          @let mine = isMine(sheet.id);
          @let expanded = previewSheetId === sheet.id;
          <div class="sheet-card"
               [class.taken]="taken && !mine"
               [class.mine]="mine"
               [class.expanded]="expanded">
            <button class="sheet-header"
                    [style.background-color]="color.bg"
                    [style.border-color]="color.border"
                    [style.color]="color.text"
                    (click)="togglePreview(sheet.id)">
              <span class="sheet-number">Tờ {{ sheet.sheetNumber }}</span>
              <span class="sheet-color">{{ color.nameVi }}</span>
              @if (mine) {
                <span class="sheet-status">Của bạn ✓</span>
              } @else if (taken) {
                @let buyer = getBuyer(sheet.id);
                <div class="buyer-info">
                  <div class="buyer-avatar">
                    @if (buyer?.avatarUrl) {
                      <img [src]="buyer?.avatarUrl" [alt]="buyer?.displayName" />
                    } @else {
                      <span>{{ buyer?.displayName?.charAt(0) || '?' }}</span>
                    }
                  </div>
                  <span class="buyer-name">{{ buyer?.displayName || 'Đã mua' }}</span>
                </div>
              } @else {
                <span class="sheet-status">
                  @if (expanded) {
                    <ng-icon name="iconoirNavArrowUp" class="status-icon"></ng-icon> Thu gọn
                  } @else {
                    <ng-icon name="iconoirNavArrowDown" class="status-icon"></ng-icon> Xem vé
                  }
                </span>
              }
            </button>

            @if (expanded && sheet.tickets?.length) {
              <div class="ticket-preview">
                @for (ticket of sheet.tickets; track ticket.id) {
                  <div class="ticket-mini">
                    <div class="ticket-label">Vé #{{ ticket.ticketNumber }}</div>
                    <table class="ticket-grid">
                      @for (row of ticket.rows; track $index) {
                        <tr>
                          @for (cell of row; track $index) {
                            <td [class.has-number]="cell !== null && cell !== 0"
                                [class.empty-cell]="cell === null || cell === 0">
                              {{ (cell !== null && cell !== 0) ? cell : '' }}
                            </td>
                          }
                        </tr>
                      }
                    </table>
                  </div>
                }
                @if (!taken && canPurchase) {
                  <button class="btn-buy"
                          [style.background-color]="color.bg"
                          (click)="onSelect(sheet); $event.stopPropagation()">
                    <ng-icon name="iconoirCart" class="btn-icon"></ng-icon> Mua Tờ {{ sheet.sheetNumber }}
                  </button>
                }
                @if (mine && canPurchase) {
                  <button class="btn-return"
                          (click)="onReturn(sheet); $event.stopPropagation()">
                    <ng-icon name="iconoirUndo" class="btn-icon"></ng-icon> Hoàn Tờ {{ sheet.sheetNumber }}
                  </button>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .sheet-selector {
      margin-bottom: 16px;
    }
    .sheet-selector h3 {
      margin: 0 0 12px 0;
      font-size: 16px;
      color: #E4E6EB;
    }
    .sheets-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 8px;
    }
    .sheet-card {
      border-radius: 8px;
      overflow: hidden;
      transition: all 0.3s;
    }
    .sheet-card.expanded {
      grid-column: 1 / -1;
    }
    .sheet-card.taken {
      opacity: 0.55;
      filter: grayscale(0.3);
    }
    .sheet-card.mine {
      box-shadow: 0 0 0 3px #00A400, 0 4px 12px rgba(0,164,0,0.4);
    }
    .sheet-header {
      width: 100%;
      padding: 10px 8px;
      border: 2px solid;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      transition: all 0.2s;
      font-family: inherit;
    }
    .sheet-card.expanded .sheet-header {
      border-radius: 8px 8px 0 0;
    }
    .sheet-header:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .sheet-number {
      font-weight: 700;
      font-size: 14px;
    }
    .sheet-color {
      font-size: 11px;
      opacity: 0.9;
    }
    .sheet-status {
      font-size: 10px;
      margin-top: 2px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .status-icon { font-size: 10px; }
    .btn-icon { font-size: 14px;  }

    /* Ticket Preview */
    .ticket-preview {
      background: #242526;
      border: 1px solid #3A3B3C;
      border-top: none;
      border-radius: 0 0 8px 8px;
      padding: 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: center;
    }
    .ticket-mini {
      background: #18191A;
      border-radius: 6px;
      padding: 8px;
      min-width: 200px;
    }
    .ticket-label {
      font-size: 12px;
      font-weight: 600;
      color: #B0B3B8;
      margin-bottom: 6px;
      text-align: center;
    }
    .ticket-grid {
      border-collapse: collapse;
      width: 100%;
    }
    .ticket-grid td {
      width: 11.1%;
      height: 28px;
      text-align: center;
      font-size: 13px;
      font-weight: 600;
      border: 1px solid #3A3B3C;
    }
    .ticket-grid td.has-number {
      background: #3A3B3C;
      color: #E4E6EB;
    }
    .ticket-grid td.empty-cell {
      background: transparent;
      color: transparent;
    }
    .btn-buy {
      width: 100%;
      padding: 10px;
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s;
      margin-top: 4px;
    }
    .btn-buy:hover {
      filter: brightness(1.1);
    }
    .btn-return {
      width: 100%;
      padding: 10px;
      border: none;
      border-radius: 6px;
      background: #FF4444;
      color: white;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s;
      margin-top: 4px;
    }
    .btn-return:hover {
      background:rgb(255, 57, 57);
    }

    /* Buyer info on taken sheets */
    .buyer-info {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 3px;
    }
    .buyer-avatar {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: rgba(255,255,255,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }
    .buyer-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }
    .buyer-avatar span {
      font-size: 9px;
      font-weight: 700;
    }
    .buyer-name {
      font-size: 10px;
      font-weight: 600;
      max-width: 80px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `],
})
export class SheetSelectorComponent {
  @Input() sheets: SheetInfo[] = [];
  @Input() takenSheets: Map<number, number> = new Map(); // sheetId -> userId
  @Input() players: Player[] = [];
  @Input() currentUserId: number | null = null;
  @Input() canPurchase = true;

  @Output() sheetSelected = new EventEmitter<SheetInfo>();
  @Output() sheetReturned = new EventEmitter<SheetInfo>();

  previewSheetId: number | null = null;

  getColor(colorGroup: string) {
    return COLOR_HEX[colorGroup] || COLOR_HEX['blue'];
  }

  isTaken(sheetId: number): boolean {
    return this.takenSheets.has(sheetId);
  }

  isMine(sheetId: number): boolean {
    return this.takenSheets.get(sheetId) === this.currentUserId;
  }

  getBuyer(sheetId: number): Player | undefined {
    const userId = this.takenSheets.get(sheetId);
    if (userId == null) return undefined;
    return this.players.find(p => p.userId === userId);
  }

  togglePreview(sheetId: number) {
    if (this.previewSheetId === sheetId) {
      this.previewSheetId = null;
    } else {
      this.previewSheetId = sheetId;
    }
  }

  onSelect(sheet: SheetInfo) {
    if (this.isTaken(sheet.id) || !this.canPurchase) return;
    this.sheetSelected.emit(sheet);
    this.previewSheetId = null;
  }

  onReturn(sheet: SheetInfo) {
    if (!this.isMine(sheet.id)) return;
    this.sheetReturned.emit(sheet);
    this.previewSheetId = null;
  }
}
