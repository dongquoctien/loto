import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PersonalReport, RoomReport } from '@loto/shared';
import { environment } from '../../../environments/environment';
import { catchError, of, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private personalReportSignal = signal<PersonalReport | null>(null);
  private roomReportSignal = signal<RoomReport | null>(null);
  private loadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);

  readonly personalReport = this.personalReportSignal.asReadonly();
  readonly roomReport = this.roomReportSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  constructor(private http: HttpClient) {}

  loadPersonalReport(roomCode: string): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.http
      .get<PersonalReport>(`${environment.apiUrl}/rooms/${roomCode}/report/personal`)
      .pipe(
        tap((report) => {
          this.personalReportSignal.set(report);
          this.loadingSignal.set(false);
        }),
        catchError((err) => {
          this.errorSignal.set(err.error?.message || 'Không thể tải báo cáo cá nhân');
          this.loadingSignal.set(false);
          return of(null);
        })
      )
      .subscribe();
  }

  loadRoomReport(roomCode: string): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.http
      .get<RoomReport>(`${environment.apiUrl}/rooms/${roomCode}/report/room`)
      .pipe(
        tap((report) => {
          this.roomReportSignal.set(report);
          this.loadingSignal.set(false);
        }),
        catchError((err) => {
          this.errorSignal.set(err.error?.message || 'Không thể tải báo cáo phòng');
          this.loadingSignal.set(false);
          return of(null);
        })
      )
      .subscribe();
  }

  loadAllReports(roomCode: string): void {
    this.loadPersonalReport(roomCode);
    this.loadRoomReport(roomCode);
  }

  clearReports(): void {
    this.personalReportSignal.set(null);
    this.roomReportSignal.set(null);
    this.errorSignal.set(null);
  }
}
