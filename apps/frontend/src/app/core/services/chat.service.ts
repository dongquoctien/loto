import { Injectable, OnDestroy, signal, computed } from '@angular/core';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { SocketService } from './socket.service';
import { ClientEvents, ServerEvents, ChatMessage, ChatMessagePayload, ChatTypingBroadcast, ChatTypingUser } from '@loto/shared';

@Injectable({ providedIn: 'root' })
export class ChatService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private currentRoomCode: string | null = null;
  private typingTimeout: ReturnType<typeof setTimeout> | null = null;
  private isCurrentlyTyping = false;

  /** All messages for the current room */
  private messagesSignal = signal<ChatMessage[]>([]);
  readonly messages = this.messagesSignal.asReadonly();

  /** Unread message count (resets when chat panel is opened) */
  private unreadCountSignal = signal(0);
  readonly unreadCount = this.unreadCountSignal.asReadonly();

  /** Whether the chat panel is currently open */
  private isPanelOpenSignal = signal(false);
  readonly isPanelOpen = this.isPanelOpenSignal.asReadonly();

  /** Users currently typing */
  private typingUsersSignal = signal<ChatTypingUser[]>([]);
  readonly typingUsers = this.typingUsersSignal.asReadonly();

  /** Computed: has unread messages */
  readonly hasUnread = computed(() => this.unreadCountSignal() > 0);

  /** Computed: typing indicator text */
  readonly typingText = computed(() => {
    const users = this.typingUsersSignal();
    if (users.length === 0) return '';
    if (users.length === 1) return `${users[0].displayName} đang nhập...`;
    if (users.length === 2) return `${users[0].displayName} và ${users[1].displayName} đang nhập...`;
    return `${users.length} người đang nhập...`;
  });

  constructor(private socketService: SocketService) {
    this.setupListeners();
  }

  private setupListeners(): void {
    // Listen for incoming messages
    this.socketService
      .on<ChatMessagePayload>(ServerEvents.CHAT_MESSAGE)
      .pipe(takeUntil(this.destroy$))
      .subscribe((message) => {
        // Only add messages for the current room
        if (message.roomCode === this.currentRoomCode) {
          this.messagesSignal.update((msgs) => [...msgs, message]);

          // Increment unread count if panel is closed
          if (!this.isPanelOpenSignal()) {
            this.unreadCountSignal.update((count) => count + 1);
          }

          // Remove typing indicator for sender
          this.typingUsersSignal.update((users) =>
            users.filter((u) => u.userId !== message.senderId)
          );
        }
      });

    // Listen for typing indicators
    this.socketService
      .on<ChatTypingBroadcast>(ServerEvents.CHAT_TYPING)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data.roomCode !== this.currentRoomCode) return;

        this.typingUsersSignal.update((users) => {
          const filtered = users.filter((u) => u.userId !== data.user.userId);
          if (data.isTyping) {
            return [...filtered, data.user];
          }
          return filtered;
        });
      });
  }

  /** Join a room's chat */
  joinRoom(roomCode: string): void {
    this.currentRoomCode = roomCode;
    this.messagesSignal.set([]);
    this.unreadCountSignal.set(0);
    this.typingUsersSignal.set([]);
  }

  /** Load chat history from server (called after room:joined) */
  loadHistory(messages: ChatMessage[]): void {
    this.messagesSignal.set(messages);
  }

  /** Leave the current room's chat */
  leaveRoom(): void {
    // Send stop typing before leaving
    if (this.isCurrentlyTyping) {
      this.sendTypingStatus(false);
    }
    this.currentRoomCode = null;
    this.messagesSignal.set([]);
    this.unreadCountSignal.set(0);
    this.typingUsersSignal.set([]);
    this.clearTypingTimeout();
  }

  /** Send a message to the current room */
  sendMessage(content: string): void {
    if (!this.currentRoomCode || !content.trim()) return;

    // Stop typing indicator when sending message
    this.sendTypingStatus(false);
    this.clearTypingTimeout();

    this.socketService.emit(ClientEvents.CHAT_SEND, {
      roomCode: this.currentRoomCode,
      content: content.trim(),
    });
  }

  /** Called when user is typing */
  onTyping(): void {
    if (!this.currentRoomCode) return;

    // Send typing start if not already typing
    if (!this.isCurrentlyTyping) {
      this.sendTypingStatus(true);
    }

    // Reset the timeout
    this.clearTypingTimeout();
    this.typingTimeout = setTimeout(() => {
      this.sendTypingStatus(false);
    }, 3000); // Stop typing after 3 seconds of inactivity
  }

  /** Stop typing indicator */
  onStopTyping(): void {
    this.clearTypingTimeout();
    if (this.isCurrentlyTyping) {
      this.sendTypingStatus(false);
    }
  }

  private sendTypingStatus(isTyping: boolean): void {
    if (!this.currentRoomCode) return;
    this.isCurrentlyTyping = isTyping;

    this.socketService.emit(ClientEvents.CHAT_TYPING, {
      roomCode: this.currentRoomCode,
      isTyping,
    });
  }

  private clearTypingTimeout(): void {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
  }

  /** Mark chat panel as opened (resets unread count) */
  openPanel(): void {
    this.isPanelOpenSignal.set(true);
    this.unreadCountSignal.set(0);
  }

  /** Mark chat panel as closed */
  closePanel(): void {
    this.isPanelOpenSignal.set(false);
  }

  /** Add a system message (for local events like player joined/left) */
  addSystemMessage(content: string): void {
    const systemMessage: ChatMessage = {
      id: `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      senderId: 0,
      senderName: 'System',
      senderAvatar: null,
      content,
      timestamp: new Date(),
      type: 'system',
    };
    this.messagesSignal.update((msgs) => [...msgs, systemMessage]);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
