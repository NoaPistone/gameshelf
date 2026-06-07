import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './core/services/auth'; // <-- Correction du chemin d'importation ici

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <div class="logo">Game<span>Shelf</span></div>
      <div class="nav-links">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">🏠 Accueil</a>
        <a routerLink="/library" routerLinkActive="active">📚 Bibliothèque & Packs</a>
        
        <ng-container>
          @if (!authService.currentUser()) {
            <button class="login-google-btn" (click)="authService.loginWithGoogle()">
              <svg class="google-icon" viewBox="0 0 24 24" width="16" height="16">
                <path fill="#EA4335" d="M12 5.04c1.64 0 3.12.56 4.28 1.67l3.2-3.2C17.52 1.58 14.96 1 12 1 7.24 1 3.2 3.73 1.24 7.72l3.84 2.98C6.01 7.2 8.79 5.04 12 5.04z"/>
                <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.39-4.87 3.39-8.49z"/>
                <path fill="#FBBC05" d="M5.08 14.7a7.11 7.11 0 0 1 0-4.41L1.24 7.31a11.934 11.934 0 0 0 0 9.38l3.84-2.99z"/>
                <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.01.68-2.31 1.09-4.3 1.09-3.21 0-5.99-2.16-6.96-5.66L1.2 15.66C3.15 19.64 7.2 23 12 23z"/>
              </svg>
              Connexion Google
            </button>
          } @else {
            <div class="user-profile-menu">
              <img 
                [src]="authService.currentUser()?.user_metadata?.['avatar_url']" 
                alt="Avatar" 
                class="user-avatar" 
              />
              <span class="user-name">{{ authService.currentUser()?.user_metadata?.['full_name'] }}</span>
              <button class="logout-btn" (click)="authService.logout()">✕</button>
            </div>
          }
        </ng-container>

      </div>
    </nav>
    <main>
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    :global(body) {
      margin: 0;
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #121214;
      color: #fff;
    }
    .navbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 30px;
      background: #1e1e24;
      border-bottom: 2px solid #2d2d38;
    }
    .logo {
      font-size: 1.6rem;
      font-weight: bold;
      letter-spacing: 1px;
    }
    .logo span { 
      color: #00ffcc; 
      border-bottom: 3px solid #00ffcc;
      padding-bottom: 2px;
    }
    .nav-links {
      display: flex;
      align-items: center;
    }
    .nav-links a {
      color: #aaa;
      text-decoration: none;
      margin-left: 20px;
      font-weight: 500;
      padding: 8px 12px;
      border-radius: 4px;
      transition: all 0.3s;
    }
    .nav-links a:hover, .nav-links a.active {
      color: #00ffcc;
      background: rgba(0, 255, 204, 0.1);
    }
    .login-google-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #252830;
      border: 1px solid #3a3f4d;
      color: #fff;
      font-weight: 500;
      padding: 8px 14px;
      margin-left: 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: background 0.2s, border-color 0.2s;
    }
    .login-google-btn:hover {
      background: #2f3440;
      border-color: #00ffcc;
    }
    .google-icon {
      display: block;
    }
    .user-profile-menu {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(0, 0, 0, 0.2);
      padding: 5px 12px;
      border-radius: 30px;
      border: 1px solid #2d2d38;
      margin-left: 20px;
    }
    .user-avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #00ffcc;
    }
    .user-name {
      font-size: 0.9rem;
      font-weight: 500;
      color: #c6d4df;
    }
    .logout-btn {
      background: transparent;
      border: none;
      color: #ff4d4d;
      cursor: pointer;
      font-weight: bold;
      font-size: 1rem;
      padding: 2px 6px;
      border-radius: 4px;
      transition: background 0.2s;
    }
    .logout-btn:hover {
      background: rgba(255, 77, 77, 0.1);
    }
    main { max-width: 1300px; margin: 0 auto; }
  `]
})
export class AppComponent {
  protected authService = inject(AuthService);
}