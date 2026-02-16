import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type RoomStatus = 'waiting' | 'playing' | 'closed';

export interface AdminRoom {
  id: number;
  roomCode: string;
  name: string;
  ownerId: number;
  ownerName: string;
  status: RoomStatus;
  playerCount: number;
  maxPlayers: number;
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRoomDetail {
  id: number;
  roomCode: string;
  name: string;
  ownerId: number;
  owner: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  callMode: 'auto' | 'manual';
  callVoice: string;
  autoCallInterval: number;
  pricePerSheet: number;
  maxPlayers: number;
  winHorizontal: boolean;
  winVertical: boolean;
  winDiagonal: boolean;
  allowHandsFree: boolean;
  hasPassword: boolean;
  backgroundMusicUrl: string | null;
  status: RoomStatus;
  createdAt: string;
  updatedAt: string;
  players: AdminRoomPlayer[];
}

export interface AdminRoomPlayer {
  id: number;
  odl: number;
  userId: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
  isReady: boolean;
  joinedAt: string;
}

export interface RoomsResponse {
  rooms: AdminRoom[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RoomStats {
  total: number;
  waiting: number;
  playing: number;
  closed: number;
}

export interface RoomFilter {
  search?: string;
  status?: RoomStatus;
  ownerId?: number;
  page?: number;
  limit?: number;
}

export interface UpdateRoomDto {
  name?: string;
  callMode?: 'auto' | 'manual';
  callVoice?: string;
  autoCallInterval?: number;
  pricePerSheet?: number;
  maxPlayers?: number;
  winHorizontal?: boolean;
  winVertical?: boolean;
  winDiagonal?: boolean;
  allowHandsFree?: boolean;
  backgroundMusicUrl?: string;
  status?: RoomStatus;
}

@Injectable({ providedIn: 'root' })
export class AdminRoomService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/admin/rooms`;

  getAll(filter: RoomFilter = {}): Observable<RoomsResponse> {
    let params = new HttpParams();

    if (filter.search) {
      params = params.set('search', filter.search);
    }
    if (filter.status) {
      params = params.set('status', filter.status);
    }
    if (filter.ownerId) {
      params = params.set('ownerId', filter.ownerId.toString());
    }
    if (filter.page) {
      params = params.set('page', filter.page.toString());
    }
    if (filter.limit) {
      params = params.set('limit', filter.limit.toString());
    }

    return this.http.get<RoomsResponse>(this.baseUrl, { params });
  }

  getStats(): Observable<RoomStats> {
    return this.http.get<RoomStats>(`${this.baseUrl}/stats`);
  }

  getById(id: number): Observable<AdminRoomDetail> {
    return this.http.get<AdminRoomDetail>(`${this.baseUrl}/${id}`);
  }

  getPlayers(id: number): Observable<AdminRoomPlayer[]> {
    return this.http.get<AdminRoomPlayer[]>(`${this.baseUrl}/${id}/players`);
  }

  update(id: number, dto: UpdateRoomDto): Observable<AdminRoomDetail> {
    return this.http.put<AdminRoomDetail>(`${this.baseUrl}/${id}`, dto);
  }

  close(id: number, reason?: string): Observable<AdminRoomDetail> {
    return this.http.post<AdminRoomDetail>(`${this.baseUrl}/${id}/close`, { reason });
  }

  delete(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`);
  }

  removePlayer(roomId: number, userId: number, reason?: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.baseUrl}/${roomId}/players/${userId}`,
      { body: { reason } }
    );
  }
}
