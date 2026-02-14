import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject, BehaviorSubject, takeUntil } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket | null = null;
  private destroy$ = new Subject<void>();

  /** Emits true when socket reconnects after a disconnect */
  private reconnected$ = new Subject<void>();
  /** Observable that components can subscribe to for reconnect events */
  readonly onReconnected$ = this.reconnected$.asObservable();

  /** Tracks connection state */
  private connectionState$ = new BehaviorSubject<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  readonly connectionState = this.connectionState$.asObservable();

  constructor(private authService: AuthService) {
    // Listen for logout to disconnect socket
    this.authService.onLogout$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      console.log('User logged out, disconnecting socket');
      this.disconnect();
    });

    // Listen for login to reconnect socket with new token
    this.authService.onLogin$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      console.log('User logged in, reconnecting socket with new token');
      this.disconnect(); // Ensure old socket is fully disconnected
      this.connect(); // Connect with new token
    });
  }

  connect(): void {
    if (this.socket?.connected) return;

    const token = this.authService.getToken();
    if (!token) return;

    this.socket = io(environment.wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected, id:', this.socket?.id);
      const prevState = this.connectionState$.value;
      this.connectionState$.next('connected');

      // If we were disconnected/reconnecting, notify subscribers to rejoin
      if (prevState === 'reconnecting' || prevState === 'disconnected') {
        this.reconnected$.next();
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.connectionState$.next(reason === 'io client disconnect' ? 'disconnected' : 'reconnecting');
    });

    this.socket.io.on('reconnect_attempt', (attempt) => {
      console.log(`Socket reconnection attempt #${attempt}`);
      this.connectionState$.next('reconnecting');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.connectionState$.next('disconnected');
  }

  emit(event: string, data?: unknown): void {
    this.socket?.emit(event, data);
  }

  on<T>(event: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      // Handler function to attach to socket
      const handler = (data: T) => subscriber.next(data);

      // If socket exists, attach handler immediately
      if (this.socket) {
        this.socket.on(event, handler);
      }

      // Subscribe to connection state to attach handler when socket connects
      const stateSub = this.connectionState$.subscribe((state) => {
        if (state === 'connected' && this.socket) {
          // Re-attach handler on reconnection (socket.io auto-removes on disconnect)
          this.socket.off(event, handler); // Remove to avoid duplicates
          this.socket.on(event, handler);
        }
      });

      return () => {
        stateSub.unsubscribe();
        this.socket?.off(event, handler);
      };
    });
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }
}
