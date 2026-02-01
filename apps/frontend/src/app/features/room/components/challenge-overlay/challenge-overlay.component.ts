import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChallengeParticipant, ChallengeResultPayload } from '@loto/shared';

interface CardState {
  picked: boolean;
  pickedBy: string | null;
  pickedByAvatar: string | null;
}

@Component({
  selector: 'app-challenge-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="challenge-backdrop">
      <div class="challenge-card">
        <div class="challenge-header">Thử Thách Bốc Bài</div>

        <!-- Participants -->
        <div class="participants-row">
          @for (p of participants; track p.userId) {
            <div class="participant" [class.picked]="hasParticipantPicked(p.userId)" [class.winner]="result && result.winnerId === p.userId">
              <div class="participant-avatar">
                @if (p.avatarUrl) {
                  <img [src]="p.avatarUrl" [alt]="p.displayName" />
                } @else {
                  <span>{{ p.displayName?.charAt(0)?.toUpperCase() || '?' }}</span>
                }
                @if (hasParticipantPicked(p.userId)) {
                  <span class="pick-check">&#10003;</span>
                }
              </div>
              <span class="participant-name">{{ p.displayName }}</span>
              @if (result) {
                <span class="participant-value">{{ getParticipantValue(p.userId) }}</span>
              }
            </div>
          }
        </div>

        <!-- Countdown -->
        @if (!result) {
          <div class="countdown-bar">
            <div class="countdown-fill" [style.width.%]="countdownPercent()"></div>
          </div>
          <div class="countdown-text">{{ countdownSeconds() }}s</div>
        }

        <!-- Cards Grid -->
        <div class="cards-grid">
          @for (card of cards; track $index; let i = $index) {
            <button
              class="card-slot"
              [class.picked]="card.picked"
              [class.my-pick]="myPick?.cardIndex === i"
              [class.revealed]="!!result"
              [class.winner-card]="result && isWinnerCard(i)"
              [disabled]="card.picked || !isParticipant || !!myPick || !!result"
              (click)="onCardClick(i)">
              @if (result) {
                <!-- Revealed: show value -->
                <span class="card-value">{{ getCardValue(i) }}</span>
                @if (getCardPickerName(i)) {
                  <div class="card-picker-info">
                    <span class="card-picker-avatar">
                      @if (getCardPickerAvatar(i)) {
                        <img [src]="getCardPickerAvatar(i)" alt="" />
                      } @else {
                        <span>{{ getCardPickerName(i)?.charAt(0)?.toUpperCase() }}</span>
                      }
                    </span>
                    <span class="card-picker">{{ getCardPickerName(i) }}</span>
                  </div>
                }
              } @else if (myPick?.cardIndex === i) {
                <!-- My pick: show my value -->
                <span class="card-value my-value">{{ myPick?.value }}</span>
              } @else if (card.picked) {
                <!-- Someone else picked: avatar + name -->
                <div class="card-picked-info">
                  <span class="card-picked-avatar">
                    @if (card.pickedByAvatar) {
                      <img [src]="card.pickedByAvatar" alt="" />
                    } @else {
                      <span>{{ card.pickedBy?.charAt(0)?.toUpperCase() }}</span>
                    }
                  </span>
                  <span class="card-picked-by">{{ card.pickedBy }}</span>
                </div>
              } @else {
                <!-- Unpicked -->
                <span class="card-question">?</span>
              }
            </button>
          }
        </div>

        <!-- Result -->
        @if (result) {
          <div class="result-section">
            <div class="result-winner">{{ result.winnerDisplayName }} thắng!</div>
          </div>
        }

        @if (!isParticipant && !result) {
          <div class="spectator-text">Đang xem thử thách...</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .challenge-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      z-index: 2500;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease-out;
    }
    .challenge-card {
      background: linear-gradient(145deg, #242526, #1a1a1b);
      border: 2px solid #9B59B6;
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      max-width: 440px;
      width: 92%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 0 60px rgba(155, 89, 182, 0.3), 0 12px 40px rgba(0, 0, 0, 0.5);
      animation: scaleIn 0.3s ease-out;
    }
    .challenge-header {
      font-size: 22px;
      font-weight: 800;
      color: #9B59B6;
      text-transform: uppercase;
      letter-spacing: 3px;
      margin-bottom: 16px;
      text-shadow: 0 0 20px rgba(155, 89, 182, 0.5);
    }

    /* Participants */
    .participants-row {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .participant {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      opacity: 0.6;
      transition: all 0.3s;
    }
    .participant.picked { opacity: 1; }
    .participant.winner {
      opacity: 1;
      filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.6));
    }
    .participant-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #3A3B3C;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
      border: 2px solid #4E4F50;
    }
    .participant.picked .participant-avatar { border-color: #9B59B6; }
    .participant.winner .participant-avatar { border-color: #FFD700; }
    .participant-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .participant-avatar > span:not(.pick-check) { color: #E4E6EB; font-size: 20px; font-weight: 700; }
    .pick-check {
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #00A400;
      color: white;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .participant-name {
      font-size: 12px;
      color: #B0B3B8;
      max-width: 80px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .participant-value {
      font-size: 14px;
      font-weight: 700;
      color: #FFD700;
    }

    /* Countdown */
    .countdown-bar {
      height: 4px;
      background: #3A3B3C;
      border-radius: 2px;
      margin-bottom: 4px;
      overflow: hidden;
    }
    .countdown-fill {
      height: 100%;
      background: linear-gradient(90deg, #9B59B6, #E94560);
      border-radius: 2px;
      transition: width 1s linear;
    }
    .countdown-text {
      font-size: 12px;
      color: #B0B3B8;
      margin-bottom: 12px;
    }

    /* Cards Grid */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }
    .card-slot {
      aspect-ratio: 3/4;
      border-radius: 8px;
      border: 2px solid #4E4F50;
      background: linear-gradient(145deg, #3A3B3C, #2C2D2E);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: all 0.3s;
      font-family: inherit;
      padding: 4px;
    }
    .card-slot:not(:disabled):hover {
      border-color: #9B59B6;
      background: linear-gradient(145deg, #4A4B4C, #3A3B3C);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(155, 89, 182, 0.3);
    }
    .card-slot:disabled {
      cursor: default;
    }
    .card-slot.picked {
      border-color: #65676B;
      background: #2C2D2E;
    }
    .card-slot.my-pick {
      border-color: #9B59B6;
      background: linear-gradient(145deg, rgba(155, 89, 182, 0.2), rgba(155, 89, 182, 0.1));
      box-shadow: 0 0 12px rgba(155, 89, 182, 0.3);
    }
    .card-slot.revealed {
      border-color: #4E4F50;
      animation: cardFlip 0.5s ease-out;
    }
    .card-slot.winner-card {
      border-color: #FFD700 !important;
      background: linear-gradient(145deg, rgba(255, 215, 0, 0.15), rgba(255, 215, 0, 0.05)) !important;
      box-shadow: 0 0 16px rgba(255, 215, 0, 0.3);
    }
    .card-question {
      font-size: 24px;
      font-weight: 700;
      color: #65676B;
    }
    .card-value {
      font-size: 20px;
      font-weight: 800;
      color: #E4E6EB;
    }
    .card-value.my-value { color: #9B59B6; }
    .card-picked-info, .card-picker-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      max-width: 100%;
      overflow: hidden;
    }
    .card-picked-avatar, .card-picker-avatar {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
      background: #4E4F50;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card-picked-avatar img, .card-picker-avatar img {
      width: 100%; height: 100%; object-fit: cover;
    }
    .card-picked-avatar span, .card-picker-avatar span {
      color: #E4E6EB; font-size: 10px; font-weight: 700;
    }
    .card-picked-by, .card-picker {
      font-size: 9px;
      color: #B0B3B8;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 50px;
      padding: 0 2px;
    }

    /* Result */
    .result-section {
      margin-top: 8px;
    }
    .result-winner {
      font-size: 18px;
      font-weight: 700;
      color: #FFD700;
      text-shadow: 0 0 12px rgba(255, 215, 0, 0.4);
      animation: pulse 2s ease-in-out infinite;
    }

    .spectator-text {
      color: #B0B3B8;
      font-size: 13px;
      margin-top: 8px;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.85); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes cardFlip {
      0% { transform: rotateY(0deg); }
      50% { transform: rotateY(90deg); }
      100% { transform: rotateY(0deg); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    @media (max-width: 420px) {
      .challenge-card { padding: 16px; }
      .challenge-header { font-size: 18px; letter-spacing: 2px; }
      .participant-avatar { width: 40px; height: 40px; }
      .cards-grid { gap: 6px; }
      .card-question { font-size: 20px; }
      .card-value { font-size: 16px; }
    }
  `],
})
export class ChallengeOverlayComponent implements OnInit, OnDestroy {
  @Input() cards: CardState[] = [];
  @Input() participants: ChallengeParticipant[] = [];
  @Input() myPick: { cardIndex: number; value: number } | null = null;
  @Input() result: ChallengeResultPayload | null = null;
  @Input() isParticipant = false;
  @Input() timeoutSeconds = 30;

  @Output() cardPicked = new EventEmitter<number>();

  countdownSeconds = signal(30);
  countdownPercent = signal(100);
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.countdownSeconds.set(this.timeoutSeconds);
    this.countdownPercent.set(100);
    this.startCountdown();
  }

  ngOnDestroy() {
    this.clearCountdown();
  }

  private startCountdown() {
    this.countdownInterval = setInterval(() => {
      const sec = this.countdownSeconds();
      if (sec <= 0 || this.result) {
        this.clearCountdown();
        return;
      }
      this.countdownSeconds.set(sec - 1);
      this.countdownPercent.set(((sec - 1) / this.timeoutSeconds) * 100);
    }, 1000);
  }

  private clearCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  onCardClick(index: number) {
    if (!this.isParticipant || this.myPick || this.result) return;
    if (this.cards[index]?.picked) return;
    this.cardPicked.emit(index);
  }

  hasParticipantPicked(userId: number): boolean {
    if (this.result) {
      return this.result.picks.some(p => p.userId === userId);
    }
    // Check by pickedBy name matching
    return false;
  }

  getParticipantValue(userId: number): string {
    if (!this.result) return '';
    const pick = this.result.picks.find(p => p.userId === userId);
    if (!pick) return 'X';
    return pick.value === -1 ? 'X' : String(pick.value);
  }

  getCardValue(index: number): string {
    if (!this.result) return '?';
    return String(this.result.allCardValues[index] ?? '?');
  }

  getCardPickerName(index: number): string | null {
    if (!this.result) return null;
    const pick = this.result.picks.find(p => p.cardIndex === index);
    return pick?.displayName ?? null;
  }

  getCardPickerAvatar(index: number): string | null {
    if (!this.result) return null;
    const pick = this.result.picks.find(p => p.cardIndex === index);
    if (!pick) return null;
    const participant = this.participants.find(p => p.userId === pick.userId);
    return participant?.avatarUrl ?? null;
  }

  isWinnerCard(index: number): boolean {
    if (!this.result) return false;
    const winnerPick = this.result.picks.find(p => p.userId === this.result!.winnerId);
    return winnerPick?.cardIndex === index;
  }
}
