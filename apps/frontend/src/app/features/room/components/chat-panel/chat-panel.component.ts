import { Component, inject, ElementRef, ViewChild, AfterViewChecked, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { iconoirChatBubble, iconoirSend, iconoirCheck, iconoirTrophy, iconoirEmoji } from '@ng-icons/iconoir';
import { ChatService } from '@app/core/services/chat.service';
import { AuthService } from '@app/core/services/auth.service';
import { ChatMessage, PaymentReportData, PaymentReportPayer, STICKERS, STICKER_CATEGORIES, Sticker, getStickerById } from '@loto/shared';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  viewProviders: [provideIcons({ iconoirChatBubble, iconoirSend, iconoirCheck, iconoirTrophy, iconoirEmoji })],
  template: `
    <div class="chat-panel">
      <div class="messages-container" #messagesContainer (scroll)="onScroll()">
        @if (chatService.messages().length === 0) {
          <div class="no-messages">
            <ng-icon name="iconoirChatBubble" class="chat-icon"></ng-icon>
            <p>Chưa có tin nhắn</p>
            <p class="hint">Hãy gửi tin nhắn đầu tiên!</p>
          </div>
        } @else {
          @for (message of chatService.messages(); track message.id) {
            <div
              class="message"
              [class.own-message]="message.senderId === currentUserId"
              [class.system-message]="message.type === 'system'"
              [class.payment-message]="message.type === 'payment_report'"
            >
              @if (message.type === 'system') {
                <div class="system-content">{{ message.content }}</div>
              } @else if (message.type === 'payment_report' && message.paymentData) {
                <div class="payment-report-card" [style]="getCardStyle(message.id)">
                  <div class="payment-header">
                    <ng-icon name="iconoirTrophy" class="trophy-icon"></ng-icon>
                    <span class="winner-label">{{ getWinTypeLabel(message.paymentData.winType) }}</span>
                  </div>

                  <div class="winner-info">
                    <div class="winner-avatar">
                      @if (message.paymentData.winnerAvatar) {
                        <img [src]="message.paymentData.winnerAvatar" [alt]="message.paymentData.winnerName" />
                      } @else {
                        <span>{{ message.paymentData.winnerName?.charAt(0) || '?' }}</span>
                      }
                    </div>
                    <div class="winner-details">
                      <span class="winner-name">{{ message.paymentData.winnerName }}</span>
                      <span class="total-amount">+{{ formatCurrency(message.paymentData.totalAmount) }}</span>
                    </div>
                  </div>

                  @if (message.paymentData.winnerQrCodeUrl) {
                    <div class="qr-section">
                      <img [src]="message.paymentData.winnerQrCodeUrl" alt="QR Code" class="qr-code" />
                    </div>
                  }

                  <div class="payers-list">
                    <div class="payers-header">Danh sách thanh toán</div>
                    @for (payer of message.paymentData.payers; track payer.userId) {
                      <div
                        class="payer-item"
                        [class.paid]="payer.paid"
                        [class.clickable]="canTogglePaid(message.paymentData, payer)"
                        (click)="onTogglePaid(message, payer)"
                      >
                        <div class="payer-checkbox">
                          @if (payer.paid) {
                            <ng-icon name="iconoirCheck" class="check-icon"></ng-icon>
                          }
                        </div>
                        <div class="payer-avatar">
                          @if (payer.avatarUrl) {
                            <img [src]="payer.avatarUrl" [alt]="payer.displayName" />
                          } @else {
                            <span>{{ payer.displayName?.charAt(0) || '?' }}</span>
                          }
                        </div>
                        <div class="payer-info">
                          <span class="payer-name">{{ payer.displayName }}</span>
                          <span class="payer-sheets">{{ payer.sheetCount }} tờ</span>
                        </div>
                        <span class="payer-amount">{{ formatCurrency(payer.amount) }}</span>
                      </div>
                    }
                  </div>

                  <div class="payment-time">{{ formatTime(message.timestamp) }}</div>
                </div>
              } @else if (message.type === 'sticker' && message.stickerId) {
                <div class="sticker-message" [class.own-sticker]="message.senderId === currentUserId">
                  @if (message.senderId !== currentUserId) {
                    <div class="message-avatar">
                      @if (message.senderAvatar) {
                        <img [src]="message.senderAvatar" [alt]="message.senderName" />
                      } @else {
                        <span>{{ message.senderName?.charAt(0) || '?' }}</span>
                      }
                    </div>
                  }
                  <div class="sticker-content">
                    @if (message.senderId !== currentUserId) {
                      <span class="sender-name">{{ message.senderName }}</span>
                    }
                    <img [src]="getStickerUrl(message.stickerId)" class="sticker-image" alt="sticker" />
                    <span class="message-time">{{ formatTime(message.timestamp) }}</span>
                  </div>
                </div>
              } @else {
                @if (message.senderId !== currentUserId) {
                  <div class="message-avatar">
                    @if (message.senderAvatar) {
                      <img [src]="message.senderAvatar" [alt]="message.senderName" />
                    } @else {
                      <span>{{ message.senderName?.charAt(0) || '?' }}</span>
                    }
                  </div>
                }
                <div class="message-content">
                  @if (message.senderId !== currentUserId) {
                    <span class="sender-name">{{ message.senderName }}</span>
                  }
                  <div class="message-bubble">{{ message.content }}</div>
                  <span class="message-time">{{ formatTime(message.timestamp) }}</span>
                </div>
              }
            </div>
          }
        }
      </div>

      @if (chatService.typingText()) {
        <div class="typing-indicator">
          <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span class="typing-text">{{ chatService.typingText() }}</span>
        </div>
      }

      <!-- Sticker Picker Panel -->
      @if (showStickerPicker()) {
        <div class="sticker-picker" (click)="$event.stopPropagation()">
          <div class="sticker-categories">
            @for (cat of stickerCategories; track cat.id) {
              <button
                class="category-btn"
                [class.active]="selectedCategory() === cat.id"
                (click)="selectCategory(cat.id)"
              >
                {{ cat.icon }}
              </button>
            }
          </div>
          <div class="sticker-grid">
            @for (sticker of filteredStickers(); track sticker.id) {
              <button class="sticker-item" (click)="sendSticker(sticker.id)">
                <img [src]="sticker.url" [alt]="sticker.id" loading="lazy" />
              </button>
            }
          </div>
        </div>
      }

      <form class="input-area" (submit)="sendMessage($event)">
        <button type="button" class="sticker-btn" (click)="toggleStickerPicker($event)">
          <ng-icon name="iconoirEmoji"></ng-icon>
        </button>
        <input
          type="text"
          [(ngModel)]="newMessage"
          name="message"
          placeholder="Nhập tin nhắn..."
          autocomplete="off"
          maxlength="500"
          (input)="onTyping()"
          (blur)="onStopTyping()"
          (focus)="closeStickerPicker()"
        />
        <button type="submit" [disabled]="!newMessage.trim()">
          <ng-icon name="iconoirSend"></ng-icon>
        </button>
      </form>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }

    .chat-panel {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      background: #242526;
    }

    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .no-messages {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #65676B;
      text-align: center;
    }

    .chat-icon {
      font-size: 48px;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    .no-messages p {
      margin: 4px 0;
    }

    .no-messages .hint {
      font-size: 12px;
      color: #8A8D91;
    }

    .message {
      display: flex;
      gap: 8px;
      max-width: 85%;
    }

    .message.own-message {
      align-self: flex-end;
      flex-direction: row-reverse;
    }

    .message.system-message {
      align-self: center;
      max-width: 100%;
    }

    .system-content {
      font-size: 11px;
      color: #8A8D91;
      background: rgba(255, 255, 255, 0.05);
      padding: 4px 12px;
      border-radius: 12px;
      text-align: center;
    }

    .message-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #3A3B3C;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .message-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }

    .message-avatar span {
      color: #B0B3B8;
      font-size: 12px;
      font-weight: 600;
    }

    .message-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .sender-name {
      font-size: 11px;
      color: #8A8D91;
      padding-left: 8px;
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: block;
    }

    .message-bubble {
      background: #3A3B3C;
      color: #E4E6EB;
      padding: 8px 12px;
      border-radius: 18px;
      font-size: 14px;
      line-height: 1.4;
      word-wrap: break-word;
    }

    .own-message .message-bubble {
      background: #1877F2;
      color: #fff;
    }

    .message-time {
      font-size: 10px;
      color: #65676B;
      padding: 0 8px;
    }

    .own-message .message-time {
      text-align: right;
    }

    .typing-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      color: #8A8D91;
      font-size: 12px;
      background: #2D2E2F;
      border-top: 1px solid #3A3B3C;
      flex-shrink: 0;
    }

    .typing-dots {
      display: flex;
      gap: 3px;
    }

    .typing-dots span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #8A8D91;
      animation: typing-bounce 1.4s infinite ease-in-out both;
    }

    .typing-dots span:nth-child(1) {
      animation-delay: -0.32s;
    }

    .typing-dots span:nth-child(2) {
      animation-delay: -0.16s;
    }

    @keyframes typing-bounce {
      0%, 80%, 100% {
        transform: scale(0.6);
        opacity: 0.5;
      }
      40% {
        transform: scale(1);
        opacity: 1;
      }
    }

    .input-area {
      display: flex;
      gap: 8px;
      padding: 12px;
      border-top: 1px solid #3A3B3C;
      background: #242526;
    }

    .input-area input {
      flex: 1;
      background: #3A3B3C;
      border: none;
      border-radius: 20px;
      padding: 10px 16px;
      color: #E4E6EB;
      font-size: 14px;
      outline: none;
    }

    .input-area input::placeholder {
      color: #65676B;
    }

    .input-area input:focus {
      box-shadow: 0 0 0 2px rgba(24, 119, 242, 0.3);
    }

    .input-area button {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #1877F2;
      border: none;
      color: #fff;
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s, transform 0.1s;
    }

    .input-area button:hover:not(:disabled) {
      background: #166FE5;
    }

    .input-area button:active:not(:disabled) {
      transform: scale(0.95);
    }

    .input-area button:disabled {
      background: #3A3B3C;
      color: #65676B;
      cursor: not-allowed;
    }

    /* Scrollbar styling */
    .messages-container::-webkit-scrollbar {
      width: 6px;
    }

    .messages-container::-webkit-scrollbar-track {
      background: transparent;
    }

    .messages-container::-webkit-scrollbar-thumb {
      background: #3A3B3C;
      border-radius: 3px;
    }

    .messages-container::-webkit-scrollbar-thumb:hover {
      background: #4E4F50;
    }

    /* Payment Report Styles */
    .message.payment-message {
      max-width: 100%;
      width: 100%;
    }

    .payment-report-card {
      background: linear-gradient(135deg, #1a472a 0%, #2d5a3e 100%);
      border-radius: 12px;
      padding: 12px;
      width: 100%;
      border: 1px solid rgba(76, 175, 80, 0.3);
    }

    .payment-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .trophy-icon {
      font-size: 20px;
      color: #FFD700;
    }

    .winner-label {
      font-weight: 600;
      color: #FFD700;
      font-size: 14px;
    }

    .winner-info {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .winner-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #3A3B3C;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border: 2px solid #FFD700;
    }

    .winner-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }

    .winner-avatar span {
      color: #FFD700;
      font-size: 18px;
      font-weight: 600;
    }

    .winner-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-width: 0;
    }

    .winner-name {
      color: #fff;
      font-weight: 600;
      font-size: 16px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .total-amount {
      color: var(--accent-color, #4CAF50);
      font-weight: 700;
      font-size: 18px;
    }

    .qr-section {
      display: flex;
      justify-content: center;
      padding: 12px;
      background: #fff;
      border-radius: 8px;
      margin-bottom: 12px;
    }

    .qr-code {
      max-width: 150px;
      max-height: 150px;
      width: 100%;
      height: auto;
    }

    .payers-list {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      padding: 8px;
    }

    .payers-header {
      font-size: 12px;
      color: #8A8D91;
      margin-bottom: 8px;
      padding-left: 4px;
    }

    .payer-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      border-radius: 8px;
      transition: background 0.2s;
    }

    .payer-item.clickable {
      cursor: pointer;
    }

    .payer-item.clickable:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .payer-item.paid {
      opacity: 0.7;
    }

    .payer-item.paid .payer-name,
    .payer-item.paid .payer-amount {
      text-decoration: line-through;
    }

    .payer-checkbox {
      width: 20px;
      height: 20px;
      border: 2px solid #65676B;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: transparent;
      transition: all 0.2s;
    }

    .payer-item.paid .payer-checkbox {
      background: var(--accent-color, #4CAF50);
      border-color: var(--accent-color, #4CAF50);
    }

    .check-icon {
      font-size: 14px;
      color: #fff;
    }

    .payer-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #3A3B3C;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .payer-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }

    .payer-avatar span {
      color: #B0B3B8;
      font-size: 11px;
      font-weight: 600;
    }

    .payer-info {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }

    .payer-name {
      color: #E4E6EB;
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .payer-sheets {
      font-size: 11px;
      color: #8A8D91;
    }

    .payer-amount {
      color: #E4E6EB;
      font-size: 13px;
      font-weight: 600;
      flex-shrink: 0;
    }

    .payment-time {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.5);
      text-align: right;
      margin-top: 8px;
    }

    /* Responsive adjustments */
    @media (max-width: 480px) {
      .payment-report-card {
        padding: 10px;
      }

      .winner-avatar {
        width: 40px;
        height: 40px;
      }

      .winner-name {
        font-size: 14px;
      }

      .total-amount {
        font-size: 16px;
      }

      .qr-code {
        max-width: 120px;
        max-height: 120px;
      }

      .payer-item {
        padding: 6px;
      }

      .payer-avatar {
        width: 24px;
        height: 24px;
      }

      .payer-name {
        font-size: 12px;
      }

      .payer-amount {
        font-size: 12px;
      }
    }

    /* Sticker Message Styles */
    .sticker-message {
      display: flex;
      gap: 8px;
    }

    .sticker-message.own-sticker {
      flex-direction: row-reverse;
    }

    .sticker-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .sticker-message.own-sticker .sticker-content {
      align-items: flex-end;
    }

    .sticker-image {
      width: 120px;
      height: 120px;
      object-fit: contain;
      border-radius: 8px;
    }

    /* Sticker Picker Styles */
    .sticker-picker {
      position: absolute;
      bottom: 70px;
      left: 12px;
      right: 12px;
      background: #2D2E2F;
      border-radius: 12px;
      border: 1px solid #3A3B3C;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 100;
      max-height: 280px;
      display: flex;
      flex-direction: column;
    }

    .sticker-categories {
      display: flex;
      gap: 4px;
      padding: 8px;
      border-bottom: 1px solid #3A3B3C;
    }

    .category-btn {
      padding: 6px 12px;
      border: none;
      background: transparent;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      transition: background 0.2s;
    }

    .category-btn:hover {
      background: #3A3B3C;
    }

    .category-btn.active {
      background: #1877F2;
    }

    .sticker-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      padding: 8px;
      overflow-y: auto;
      flex: 1;
    }

    .sticker-item {
      aspect-ratio: 1;
      border: none;
      background: transparent;
      border-radius: 8px;
      cursor: pointer;
      padding: 4px;
      transition: background 0.2s, transform 0.1s;
    }

    .sticker-item:hover {
      background: #3A3B3C;
      transform: scale(1.05);
    }

    .sticker-item img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .sticker-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: transparent;
      border: none;
      color: #8A8D91;
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s, background 0.2s;
      flex-shrink: 0;
    }

    .sticker-btn:hover {
      color: #E4E6EB;
      background: #3A3B3C;
    }

    /* Sticker picker scrollbar */
    .sticker-grid::-webkit-scrollbar {
      width: 6px;
    }

    .sticker-grid::-webkit-scrollbar-track {
      background: transparent;
    }

    .sticker-grid::-webkit-scrollbar-thumb {
      background: #3A3B3C;
      border-radius: 3px;
    }

    /* Responsive sticker adjustments */
    @media (max-width: 480px) {
      .sticker-image {
        width: 100px;
        height: 100px;
      }

      .sticker-grid {
        grid-template-columns: repeat(3, 1fr);
      }

      .sticker-picker {
        max-height: 220px;
      }
    }
  `]
})
export class ChatPanelComponent implements AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  chatService = inject(ChatService);
  private authService = inject(AuthService);

  newMessage = '';
  private shouldScrollToBottom = true;
  private isNearBottom = true;
  private lastMessageCount = 0;

  /** Color themes for payment report cards */
  private readonly cardThemes = [
    { gradient: 'linear-gradient(135deg, #1a472a 0%, #2d5a3e 100%)', border: 'rgba(76, 175, 80, 0.3)', accent: '#4CAF50' },  // Green
    { gradient: 'linear-gradient(135deg, #1a365d 0%, #2a4a7f 100%)', border: 'rgba(66, 153, 225, 0.3)', accent: '#4299E1' },  // Blue
    { gradient: 'linear-gradient(135deg, #44337a 0%, #6b46c1 100%)', border: 'rgba(159, 122, 234, 0.3)', accent: '#9F7AEA' },  // Purple
    { gradient: 'linear-gradient(135deg, #742a2a 0%, #9b2c2c 100%)', border: 'rgba(245, 101, 101, 0.3)', accent: '#F56565' },  // Red
    { gradient: 'linear-gradient(135deg, #744210 0%, #975a16 100%)', border: 'rgba(237, 137, 54, 0.3)', accent: '#ED8936' },   // Orange
    { gradient: 'linear-gradient(135deg, #285e61 0%, #319795 100%)', border: 'rgba(56, 178, 172, 0.3)', accent: '#38B2AC' },   // Teal
    { gradient: 'linear-gradient(135deg, #702459 0%, #97266d 100%)', border: 'rgba(237, 100, 166, 0.3)', accent: '#ED64A6' },  // Pink
    { gradient: 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)', border: 'rgba(160, 174, 192, 0.3)', accent: '#A0AEC0' },  // Gray
  ];

  /** Map to cache card styles per message ID */
  private cardStyleCache = new Map<string, string>();

  /** Sticker picker state */
  showStickerPicker = signal(false);
  selectedCategory = signal<string>('working');
  stickerCategories = STICKER_CATEGORIES;

  /** Filtered stickers based on selected category */
  filteredStickers = signal<Sticker[]>(STICKERS.filter(s => s.category === 'working'));

  get currentUserId(): number | null {
    return this.authService.user()?.id ?? null;
  }

  /** Get card style based on message ID (consistent color per message) */
  getCardStyle(messageId: string): string {
    // Return cached style if exists
    if (this.cardStyleCache.has(messageId)) {
      return this.cardStyleCache.get(messageId)!;
    }

    // Generate consistent index from message ID
    let hash = 0;
    for (let i = 0; i < messageId.length; i++) {
      hash = (hash << 5) - hash + messageId.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    const index = Math.abs(hash) % this.cardThemes.length;
    const theme = this.cardThemes[index];

    const style = `background: ${theme.gradient}; border-color: ${theme.border}; --accent-color: ${theme.accent}`;
    this.cardStyleCache.set(messageId, style);
    return style;
  }

  ngAfterViewChecked(): void {
    const currentMessageCount = this.chatService.messages().length;

    // Auto-scroll when user sends message (shouldScrollToBottom flag)
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
    // Auto-scroll when new message arrives AND user was near bottom
    else if (currentMessageCount > this.lastMessageCount && this.isNearBottom) {
      this.scrollToBottom();
    }

    this.lastMessageCount = currentMessageCount;
  }

  onScroll(): void {
    const container = this.messagesContainer?.nativeElement;
    if (container) {
      // Check if user is within 100px of bottom
      const threshold = 100;
      this.isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    }
  }

  sendMessage(event: Event): void {
    event.preventDefault();
    if (!this.newMessage.trim()) return;

    this.chatService.sendMessage(this.newMessage);
    this.newMessage = '';
    // Always scroll to bottom when user sends message
    this.shouldScrollToBottom = true;
  }

  onTyping(): void {
    this.chatService.onTyping();
  }

  onStopTyping(): void {
    this.chatService.onStopTyping();
  }

  formatTime(timestamp: Date | string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  getWinTypeLabel(winType: string): string {
    switch (winType) {
      case 'horizontal':
        return '🎉 Kinh Ngang';
      case 'vertical':
        return '🎉 Kinh Dọc';
      case 'diagonal':
        return '🎉 Kinh Chéo';
      default:
        return '🎉 Kinh';
    }
  }

  canTogglePaid(paymentData: PaymentReportData, payer: PaymentReportPayer): boolean {
    // Winner can toggle any payer, payer can toggle themselves
    return (
      this.currentUserId === paymentData.winnerId ||
      this.currentUserId === payer.userId
    );
  }

  onTogglePaid(message: ChatMessage, payer: PaymentReportPayer): void {
    if (!message.paymentData || !this.canTogglePaid(message.paymentData, payer)) {
      return;
    }

    this.chatService.togglePaymentPaid(message.id, payer.userId, !payer.paid);
  }

  /** Toggle sticker picker visibility */
  toggleStickerPicker(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.showStickerPicker.update(v => !v);
  }

  /** Close sticker picker */
  closeStickerPicker(): void {
    this.showStickerPicker.set(false);
  }

  /** Select sticker category */
  selectCategory(categoryId: string): void {
    this.selectedCategory.set(categoryId);
    this.filteredStickers.set(STICKERS.filter(s => s.category === categoryId));
  }

  /** Send a sticker */
  sendSticker(stickerId: string): void {
    this.chatService.sendSticker(stickerId);
    this.showStickerPicker.set(false);
    this.shouldScrollToBottom = true;
  }

  /** Get sticker URL by ID */
  getStickerUrl(stickerId: string): string {
    const sticker = getStickerById(stickerId);
    return sticker?.url || '';
  }

  /** Close sticker picker when clicking outside */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.showStickerPicker()) {
      this.closeStickerPicker();
    }
  }

  private scrollToBottom(): void {
    try {
      const container = this.messagesContainer?.nativeElement;
      if (container) {
        // Use double requestAnimationFrame to ensure DOM is fully rendered and painted
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
          });
        });
      }
    } catch (err) {
      // Ignore scroll errors
    }
  }
}
