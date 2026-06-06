import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <div class="logo">Game<span>Shelf</span></div>
      <div class="nav-links">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">🏠 Accueil</a>
        <a routerLink="/library" routerLinkActive="active">📚 Bibliothèque & Packs</a>
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
      border-bottom: 3px solid #00ffcc; /* Effet d'étagère sous le mot Shelf */
      padding-bottom: 2px;
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
    main { max-width: 1300px; margin: 0 auto; }
  `]
})
export class AppComponent {}