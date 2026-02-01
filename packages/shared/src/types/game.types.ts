import { WinType, SheetData, TicketData, MarkedCell, LineDetails } from './ticket.types';
import { UserPublic } from './user.types';
import { RoomData } from './room.types';

export type GameStatus = 'preparing' | 'active' | 'paused_for_kinh' | 'finished';

export interface GameSessionData {
  id: number;
  roomId: number;
  sessionNumber: number;
  status: GameStatus;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface PurchasedSheetInfo {
  sheetId: number;
  userId: number;
  displayName: string;
}

export interface NumberCalledPayload {
  number: number;
  callOrder: number;
  calledNumbers: number[];
  remainingCount: number;
}

export interface KinhClaimPayload {
  sessionId: number;
  ticketId: number;
  winType: WinType;
  lineDetails: LineDetails;
}

export interface KinhVerifyPayload {
  claimantId: number;
  claimantName: string;
  ticket: TicketData;
  markedCells: MarkedCell[];
  calledNumbers: number[];
  winType: WinType;
  lineDetails: LineDetails;
}

export interface WinnerAnnouncement {
  winner: {
    userId: number;
    displayName: string;
    avatarUrl: string | null;
    qrCodeUrl: string | null;
  };
  amountToPay: number;
  winType: WinType;
  yourSheetCount: number;
}

export interface PaymentInfo {
  userId: number;
  sheetCount: number;
  amount: number;
  reason: 'lost' | 'penalty';
}

export interface RoomJoinedPayload {
  room: RoomData;
  players: { user: UserPublic; isOnline: boolean }[];
  currentSession: GameSessionData | null;
  availableSheets: SheetData[];
  purchasedSheets: PurchasedSheetInfo[];
  calledNumbers: number[];
}

export interface GameResultData {
  sessionId: number;
  winnerId: number;
  winnerName: string;
  winType: WinType;
  ticketId: number;
}

// Multi-KINH claim types
export interface KinhClaimOverlayItem {
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  winType: WinType;
  winningNumbers: number[];
  claimOrder: number;
}

export interface KinhClaimsUpdatedPayload {
  claims: KinhClaimOverlayItem[];
}

export interface KinhVerifyClaimItem {
  userId: number;
  displayName: string;
  ticket: TicketData;
  markedCells: MarkedCell[];
  calledNumbers: number[];
  winType: WinType;
  lineDetails: LineDetails;
  preValidated: boolean;
}

export interface KinhVerifyRequestPayload {
  claims: KinhVerifyClaimItem[];
}

// Challenge (card mini-game) types
export interface ChallengeParticipant {
  userId: number;
  displayName: string;
  avatarUrl: string | null;
}

export interface ChallengeStartedPayload {
  cardCount: number;
  participants: ChallengeParticipant[];
  timeoutSeconds: number;
}

export interface ChallengeCardPickedPayload {
  userId: number;
  displayName: string;
  cardIndex: number;
}

export interface ChallengeYourPickPayload {
  cardIndex: number;
  value: number;
}

export interface ChallengePickInfo {
  userId: number;
  displayName: string;
  cardIndex: number;
  value: number;
}

export interface ChallengeResultPayload {
  winnerId: number;
  winnerDisplayName: string;
  picks: ChallengePickInfo[];
  allCardValues: number[];
}
