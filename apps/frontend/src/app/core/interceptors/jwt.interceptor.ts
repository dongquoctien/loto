import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req).pipe(
    catchError((error) => {
      // Handle 401 Unauthorized - token expired or invalid
      if (error.status === 401 && authService.isLoggedIn()) {
        alert('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại');
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
