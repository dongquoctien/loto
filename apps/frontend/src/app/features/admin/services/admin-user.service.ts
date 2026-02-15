import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type UserRole = 'user' | 'admin';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  qrCodeUrl: string | null;
  winCount: number;
  role: UserRole;
  isBanned: boolean;
  bannedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  role?: UserRole;
}

export interface UpdateUserDto {
  username?: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  qrCodeUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminUserService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/admin/users`;

  getAll(page = 1, limit = 20): Observable<UsersResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<UsersResponse>(this.baseUrl, { params });
  }

  getById(id: number): Observable<AdminUser> {
    return this.http.get<AdminUser>(`${this.baseUrl}/${id}`);
  }

  create(dto: CreateUserDto): Observable<AdminUser> {
    return this.http.post<AdminUser>(this.baseUrl, dto);
  }

  update(id: number, dto: UpdateUserDto): Observable<AdminUser> {
    return this.http.put<AdminUser>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`);
  }

  changeRole(id: number, role: UserRole): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.baseUrl}/${id}/role`, { role });
  }

  resetPassword(id: number, password: string): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${this.baseUrl}/${id}/reset-password`, { password });
  }

  setBanStatus(id: number, banned: boolean): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.baseUrl}/${id}/ban`, { banned });
  }
}
