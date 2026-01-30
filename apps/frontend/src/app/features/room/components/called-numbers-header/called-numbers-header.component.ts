import { Component, Input, ElementRef, ViewChild, AfterViewChecked, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-called-numbers-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="called-numbers-container">
      <div class="stats">
        <span class="count">{{ calledNumbers.length }}/90</span>
      </div>
      <div class="numbers-scroll" #scrollContainer>
        @for (num of calledNumbers; track num; let i = $index) {
          <span class="number-ball"
                [attr.data-num]="num"
                [class.latest]="i === calledNumbers.length - 1 && highlightNumber === null"
                [class.recent]="i >= calledNumbers.length - 3 && highlightNumber === null"
                [class.search-highlight]="num === highlightNumber">
            {{ num }}
          </span>
        }
      </div>
      @if (lastCalled !== null) {
        <div class="last-called">
          <span class="big-number">{{ lastCalled }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .called-numbers-container {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      background: #242526;
      border-bottom: 1px solid #3A3B3C;
    }
    .stats {
      flex-shrink: 0;
    }
    .count {
      background: #3A3B3C;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      color: #B0B3B8;
    }
    .numbers-scroll {
      flex: 1;
      display: flex;
      gap: 4px;
      overflow-x: auto;
      padding: 4px 0;
      scrollbar-width: thin;
      scrollbar-color: #3A3B3C transparent;
    }
    .numbers-scroll::-webkit-scrollbar { height: 4px; }
    .numbers-scroll::-webkit-scrollbar-track { background: transparent; }
    .numbers-scroll::-webkit-scrollbar-thumb { background: #3A3B3C; border-radius: 2px; }

    .number-ball {
      flex-shrink: 0;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      background: #3A3B3C;
      color: #B0B3B8;
      transition: all 0.3s;
    }
    .number-ball.recent {
      background: darkred;
      color: white;
    }
    .number-ball.latest {
      background: #FFD700;
      color: #1C1E21;
      animation: popIn 0.4s ease-out;
      box-shadow: 0 0 12px rgba(255, 215, 0, 0.5);
    }
    @keyframes popIn {
      0% { transform: scale(0); opacity: 0; }
      60% { transform: scale(1.3); }
      100% { transform: scale(1); opacity: 1; }
    }
    .last-called {
      flex-shrink: 0;
    }
    .big-number {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: red;
      color: white;
      font-size: 22px;
      font-weight: 800;
      box-shadow: 0 4px 15px rgba(242, 24, 24, 0.5);
      animation: pulse 1s ease-out;
    }
    @keyframes pulse {
      0% { transform: scale(0.5); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
    .number-ball.search-highlight {
      background: #00E676 !important;
      color: #000 !important;
      box-shadow: 0 0 16px rgba(0, 230, 118, 0.7);
      transform: scale(1.25);
      z-index: 1;
      animation: searchPulse 1s ease-in-out infinite;
    }
    @keyframes searchPulse {
      0%, 100% { box-shadow: 0 0 16px rgba(0, 230, 118, 0.7); }
      50% { box-shadow: 0 0 24px rgba(0, 230, 118, 1); }
    }
  `],
})
export class CalledNumbersHeaderComponent implements AfterViewChecked, OnChanges {
  @Input() calledNumbers: number[] = [];
  @Input() lastCalled: number | null = null;
  @Input() highlightNumber: number | null = null;

  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  private prevLength = 0;

  ngAfterViewChecked() {
    if (this.calledNumbers.length !== this.prevLength && this.scrollContainer) {
      this.prevLength = this.calledNumbers.length;
      if (this.highlightNumber === null) {
        const el = this.scrollContainer.nativeElement;
        el.scrollLeft = el.scrollWidth;
      }
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['highlightNumber'] && this.highlightNumber !== null) {
      this.scrollToNumber(this.highlightNumber);
    }
  }

  private scrollToNumber(num: number) {
    if (!this.scrollContainer) return;
    const container = this.scrollContainer.nativeElement;
    const ball = container.querySelector(`[data-num="${num}"]`) as HTMLElement;
    if (ball) {
      ball.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }
}
