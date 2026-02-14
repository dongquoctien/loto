import { Component, inject, ElementRef, ViewChild, AfterViewChecked, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { iconoirChatBubble, iconoirSend } from '@ng-icons/iconoir';
import { ChatService } from '@app/core/services/chat.service';
import { AuthService } from '@app/core/services/auth.service';
import { ChatMessage } from '@loto/shared';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  viewProviders: [provideIcons({ iconoirChatBubble, iconoirSend })],
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
            >
              @if (message.type === 'system') {
                <div class="system-content">{{ message.content }}</div>
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

      <form class="input-area" (submit)="sendMessage($event)">
        <input
          type="text"
          [(ngModel)]="newMessage"
          name="message"
          placeholder="Nhập tin nhắn..."
          autocomplete="off"
          maxlength="500"
          (input)="onTyping()"
          (blur)="onStopTyping()"
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

  get currentUserId(): number | null {
    return this.authService.user()?.id ?? null;
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

  private scrollToBottom(): void {
    try {
      const container = this.messagesContainer?.nativeElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    } catch (err) {
      // Ignore scroll errors
    }
  }
}
