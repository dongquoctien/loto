import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Must be logged in
  if (!authService.isLoggedIn()) {
    return router.parseUrl('/login');
  }

  // Must be admin
  if (!authService.isAdmin()) {
    return router.parseUrl('/lobby');
  }

  return true;
};
