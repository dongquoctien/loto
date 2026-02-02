import { UserPublic } from './user.types';

export type CallMode = 'auto' | 'manual';
export type CallVoice = 'default' | 'female' | 'male' | 'bede';
export type RoomStatus = 'waiting' | 'playing' | 'finished' | 'closed';

export interface RoomData {
  id: number;
  roomCode: string;
  name: string;
  ownerId: number;
  ownerName: string;
  callMode: CallMode;
  callVoice: CallVoice;
  autoCallInterval: number;
  pricePerSheet: number;
  winHorizontal: boolean;
  winVertical: boolean;
  winDiagonal: boolean;
  allowHandsFree: boolean;
  status: RoomStatus;
  maxPlayers: number;
  playerCount: number;
  createdAt: string;
}

export interface CreateRoomRequest {
  name: string;
  callMode: CallMode;
  callVoice?: CallVoice;
  autoCallInterval?: number;
  pricePerSheet: number;
  winHorizontal?: boolean;
  winVertical?: boolean;
  winDiagonal?: boolean;
  allowHandsFree?: boolean;
  maxPlayers?: number;
}

export interface UpdateRoomRequest {
  callMode?: CallMode;
  autoCallInterval?: number;
  pricePerSheet?: number;
  winHorizontal?: boolean;
  winVertical?: boolean;
  winDiagonal?: boolean;
  allowHandsFree?: boolean;
}

export interface RoomPlayer {
  user: UserPublic;
  isOnline: boolean;
  joinedAt: string;
}
