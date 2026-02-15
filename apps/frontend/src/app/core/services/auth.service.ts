import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export type UserRole = 'user' | 'admin';

interface AuthUser {
  id: number;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  qrCodeUrl: string | null;
  role: UserRole;
  winCount?: number;
}

interface AuthResponse {
  user: AuthUser;
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUser = signal<AuthUser | null>(null);
  private token = signal<string | null>(null);

  /** Emits when user logs out - SocketService listens to disconnect */
  private logoutSubject = new Subject<void>();
  readonly onLogout$ = this.logoutSubject.asObservable();

  /** Emits when user logs in - SocketService listens to reconnect with new token */
  private loginSubject = new Subject<void>();
  readonly onLogin$ = this.loginSubject.asObservable();

  readonly user = this.currentUser.asReadonly();
  readonly isLoggedIn = computed(() => !!this.token());
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    this.loadFromStorage();
  }

  register(username: string, email: string, password: string, displayName?: string) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, {
        username,
        email,
        password,
        displayName,
      })
      .pipe(tap((res) => this.handleAuth(res)));
  }

  login(username: string, password: string) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, {
        username,
        password,
      })
      .pipe(tap((res) => this.handleAuth(res)));
  }

  logout() {
    this.logoutSubject.next(); // Notify SocketService to disconnect
    this.currentUser.set(null);
    this.token.set(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.token();
  }

  updateUser(user: AuthUser) {
    this.currentUser.set(user);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }

  private handleAuth(response: AuthResponse) {
    this.currentUser.set(response.user);
    this.token.set(response.token);
    localStorage.setItem('auth_token', response.token);
    localStorage.setItem('auth_user', JSON.stringify(response.user));
    this.loginSubject.next(); // Notify SocketService to reconnect with new token
  }

  private loadFromStorage() {
    const token = localStorage.getItem('auth_token');
    const userJson = localStorage.getItem('auth_user');
    if (token && userJson) {
      this.token.set(token);
      this.currentUser.set(JSON.parse(userJson));
    }
  }
}
