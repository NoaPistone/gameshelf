import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'library',
    loadComponent: () => import('./features/library/library.component').then(m => m.LibraryComponent)
  },
  {
    path: 'game/:slug', // On utilise :slug pour capturer le nom du jeu dans l'URL
    loadComponent: () => import('./features/game-detail/game-detail.component').then(m => m.GameDetailComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];