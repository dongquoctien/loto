import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface MonthlyStats {
  month: number;
  games: number;
  revenue: number;
  players: number;
}

export interface OverallStats {
  year: number;
  totalGames: number;
  totalRooms: number;
  totalPlayers: number;
  totalRevenue: number;
  totalSheetsPurchased: number;
  monthlyStats: MonthlyStats[];
}

export interface PlayerStats {
  userId: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  gamesPlayed: number;
  gamesWon: number;
  sheetsPurchased: number;
  totalWinnings: number;
  totalLosses: number;
  netProfit: number;
}

export interface RoomStats {
  roomId: number;
  roomCode: string;
  roomName: string;
  ownerName: string;
  pricePerSheet: number;
  totalGames: number;
  totalSheets: number;
  totalRevenue: number;
  status: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class AdminStatsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/admin/stats`;

  /**
   * Get overall statistics for a year
   */
  getOverallStats(year?: number): Observable<OverallStats> {
    const params: Record<string, string> = {};
    if (year) params['year'] = year.toString();
    return this.http.get<OverallStats>(`${this.baseUrl}/overall`, { params });
  }

  /**
   * Get statistics by player
   */
  getPlayerStats(
    year?: number,
    limit = 50,
    offset = 0
  ): Observable<PaginatedResponse<PlayerStats>> {
    const params: Record<string, string> = {
      limit: limit.toString(),
      offset: offset.toString(),
    };
    if (year) params['year'] = year.toString();
    return this.http.get<PaginatedResponse<PlayerStats>>(
      `${this.baseUrl}/players`,
      { params }
    );
  }

  /**
   * Get statistics by room
   */
  getRoomStats(
    year?: number,
    limit = 50,
    offset = 0
  ): Observable<PaginatedResponse<RoomStats>> {
    const params: Record<string, string> = {
      limit: limit.toString(),
      offset: offset.toString(),
    };
    if (year) params['year'] = year.toString();
    return this.http.get<PaginatedResponse<RoomStats>>(`${this.baseUrl}/rooms`, {
      params,
    });
  }

  /**
   * Get available years for filtering
   */
  getAvailableYears(): Observable<number[]> {
    return this.http.get<number[]>(`${this.baseUrl}/years`);
  }

  /**
   * Get top players by net profit
   */
  getTopPlayers(limit = 10, year?: number): Observable<PlayerStats[]> {
    const params: Record<string, string> = { limit: limit.toString() };
    if (year) params['year'] = year.toString();
    return this.http.get<PlayerStats[]>(`${this.baseUrl}/top-players`, { params });
  }

  /**
   * Get top rooms by revenue
   */
  getTopRooms(limit = 10, year?: number): Observable<RoomStats[]> {
    const params: Record<string, string> = { limit: limit.toString() };
    if (year) params['year'] = year.toString();
    return this.http.get<RoomStats[]>(`${this.baseUrl}/top-rooms`, { params });
  }
}
