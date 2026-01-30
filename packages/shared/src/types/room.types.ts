import { UserPublic } from './user.types';

export type CallMode = 'auto' | 'manual';
export type RoomStatus = 'waiting' | 'playing' | 'finished' | 'closed';

export interface RoomData {
  id: number;
  roomCode: string;
  name: string;
  ownerId: number;
  ownerName: string;
  callMode: CallMode;
  autoCallInterval: number;
  pricePerSheet: number;
  winHorizontal: boolean;
  winVertical: boolean;
  winDiagonal: boolean;
  status: RoomStatus;
  maxPlayers: number;
  playerCount: number;
  createdAt: string;
}

export interface CreateRoomRequest {
  name: string;
  callMode: CallMode;
  autoCallInterval?: number;
  pricePerSheet: number;
  winHorizontal?: boolean;
  winVertical?: boolean;
  winDiagonal?: boolean;
  maxPlayers?: number;
}

export interface UpdateRoomRequest {
  callMode?: CallMode;
  autoCallInterval?: number;
  pricePerSheet?: number;
  winHorizontal?: boolean;
  winVertical?: boolean;
  winDiagonal?: boolean;
}

export interface RoomPlayer {
  user: UserPublic;
  isOnline: boolean;
  joinedAt: string;
}
