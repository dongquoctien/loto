import { Routes } from '@angular/router';
import { AdminComponent } from './admin.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminComponent,
    children: [
      {
        path: '',
        redirectTo: 'stickers',
        pathMatch: 'full',
      },
      {
        path: 'stickers',
        loadComponent: () =>
          import('./components/sticker-management.component').then(
            (m) => m.StickerManagementComponent
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./components/user-management.component').then(
            (m) => m.UserManagementComponent
          ),
      },
    ],
  },
];
