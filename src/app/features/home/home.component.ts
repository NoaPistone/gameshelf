import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BacklogService } from '../../core/services/backlog.service';
import { AuthService } from '../../core/services/auth'; // Chemin vers ton service d'authentification
import { Router, RouterModule } from '@angular/router'; 

export type CalendarCategory = 'gamesBought' | 'gamesStarted' | 'gamesFinished' | 'gamesPlayed100';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  public backlogService = inject(BacklogService);
  private authService = inject(AuthService);
  private router = inject(Router);
  
  public latestGames = this.backlogService.latestGames;
  public searchResults = this.backlogService.searchResults;
  public isSearching = this.backlogService.isSearching;
  public searchQuery = signal<string>('');

  // Configuration temporelle du calendrier
  public currentYear = signal<number>(2026);
  public currentMonth = signal<number>(5); // 5 = Juin
  public months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  
  public calendarCategories: CalendarCategory[] = ['gamesBought', 'gamesStarted', 'gamesFinished', 'gamesPlayed100'];

  public monthKey = computed(() => `${this.currentYear()}-${(this.currentMonth() + 1).toString().padStart(2, '0')}`);
  
  // Transformé en signal classique pour gérer l'asynchronisme de la base distante
  public monthData = signal<any>({ gamesBought: [], gamesStarted: [], gamesFinished: [], gamesPlayed100: [] });

  // Recherche indépendante pour les 4 colonnes
  public columnInputs = {
    gamesBought: signal<string>(''),
    gamesStarted: signal<string>(''),
    gamesFinished: signal<string>(''),
    gamesPlayed100: signal<string>('')
  };
  
  public columnResults = {
    gamesBought: signal<any[]>([]),
    gamesStarted: signal<any[]>([]),
    gamesFinished: signal<any[]>([]),
    gamesPlayed100: signal<any[]>([])
  };

  constructor() {
    // L'effet surveille le changement de mois OU la connexion de l'utilisateur pour charger dynamiquement
    effect(async () => {
      const key = this.monthKey();
      const user = this.authService.currentUser(); // Réagit si l'utilisateur s'identifie/se déconnecte
      
      const data = await this.backlogService.getMonthData(key);
      this.monthData.set(data);
    }, { allowSignalWrites: true });
  }

  onSearchChange() {
    this.backlogService.searchGames(this.searchQuery());
  }

  async onColumnSearchChange(cat: CalendarCategory) {
    const query = this.columnInputs[cat]();
    if (query.trim().length < 2) {
      this.columnResults[cat].set([]);
      return;
    }
    const res = await this.backlogService.searchGamesDirect(query);
    this.columnResults[cat].set(res);
  }

  openGameDetails(slug: string) {
    this.router.navigate(['/game', slug]);
  }

  async addItemDirectly(cat: CalendarCategory, game: any) {
    const d = { ...this.monthData() };
    
    const gameItem = {
      name: game.name,
      image: game.background_image || 'assets/images/placeholder-game.jpg'
    };

    // Ajout local réactif immédiat à l'écran
    d[cat] = [...d[cat], gameItem];
    this.monthData.set(d);
    
    // Écriture asynchrone (Supabase ou LocalStorage selon le statut)
    await this.backlogService.updateMonthData(this.monthKey(), d);
    
    this.columnInputs[cat].set('');
    this.columnResults[cat].set([]);
  }

  async removeItem(cat: CalendarCategory, i: number) { 
    const d = { ...this.monthData() }; 
    d[cat] = d[cat].filter((_: any, idx: number) => idx !== i); 
    
    this.monthData.set(d);
    await this.backlogService.updateMonthData(this.monthKey(), d); 
  }

  changeMonth(delta: number) { 
    let nm = this.currentMonth() + delta; 
    let ny = this.currentYear(); 
    if (nm > 11) { 
      nm = 0; 
      ny++; 
    } else if (nm < 0) { 
      nm = 11; 
      ny--; 
    } 
    this.currentMonth.set(nm); 
    this.currentYear.set(ny); 
  }
}