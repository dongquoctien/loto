export interface ChatMessage {
  id: string;
  senderId: number;
  senderName: string;
  senderAvatar: string | null;
  content: string;
  timestamp: Date;
  type: 'text' | 'system';
}

export interface ChatSendPayload {
  roomCode: string;
  content: string;
}

export interface ChatMessagePayload extends ChatMessage {
  roomCode: string;
}

export interface ChatTypingPayload {
  roomCode: string;
  isTyping: boolean;
}

export interface ChatTypingUser {
  userId: number;
  displayName: string;
}

export interface ChatTypingBroadcast {
  roomCode: string;
  user: ChatTypingUser;
  isTyping: boolean;
}
