/** Payment item in a payment report message */
export interface PaymentReportPayer {
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  sheetCount: number;
  amount: number;
  paid: boolean;
}

/** Payment report data for payment_report type messages */
export interface PaymentReportData {
  winnerId: number;
  winnerName: string;
  winnerAvatar: string | null;
  winnerQrCodeUrl: string | null;
  winType: 'horizontal' | 'vertical' | 'diagonal';
  totalAmount: number;
  payers: PaymentReportPayer[];
}

export interface ChatMessage {
  id: string;
  senderId: number;
  senderName: string;
  senderAvatar: string | null;
  content: string;
  timestamp: Date;
  type: 'text' | 'system' | 'payment_report' | 'sticker';
  /** Only present for type='payment_report' */
  paymentData?: PaymentReportData;
  /** Only present for type='sticker' - contains sticker ID */
  stickerId?: string;
}

export interface ChatSendPayload {
  roomCode: string;
  content: string;
  /** Optional sticker ID - if provided, sends a sticker message */
  stickerId?: string;
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

/** Payload for toggling payment status */
export interface PaymentTogglePaidPayload {
  roomCode: string;
  messageId: string;
  payerUserId: number;
  paid: boolean;
}

/** Broadcast when payment status is updated */
export interface PaymentStatusUpdatedPayload {
  roomCode: string;
  messageId: string;
  payerUserId: number;
  paid: boolean;
  updatedBy: number;
}
