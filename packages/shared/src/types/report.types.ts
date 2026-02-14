/**
 * Report Types for Cash Flow Statistics
 */

export interface PlayerDebt {
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  amount: number; // Total amount owed
  gameCount: number; // Number of games
}

export interface PersonalReport {
  userId: number;
  totalProfit: number; // Positive = profit, Negative = loss
  totalWins: number;
  totalLosses: number;
  gamesPlayed: number;
  owedToMe: PlayerDebt[]; // Others owe me
  iOwe: PlayerDebt[]; // I owe others
}

export interface RoomReportPlayer {
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  totalProfit: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
}

export interface RoomReport {
  roomCode: string;
  roomName: string;
  totalGames: number;
  pricePerSheet: number;
  players: RoomReportPlayer[];
}
