import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BacklogService } from '../../core/services/backlog.service';
import { Router, RouterModule } from '@angular/router'; 

// Définition d'un type strict pour éviter les erreurs d'indexation
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
  private router = inject(Router);
  
  public latestGames = this.backlogService.latestGames;
  public searchResults = this.backlogService.searchResults;
  public isSearching = this.backlogService.isSearching;
  public searchQuery = signal<string>('');

  // Gestion du calendrier (Juin 2026 par défaut ou dynamique)
  public currentYear = signal<number>(2026);
  public currentMonth = signal<number>(5); // 5 correspond à Juin (0 = Janvier)
  public months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  
  // Tableau des catégories typé strictement pour le *ngFor du template HTML
  public calendarCategories: CalendarCategory[] = ['gamesBought', 'gamesStarted', 'gamesFinished', 'gamesPlayed100'];

  public monthKey = computed(() => `${this.currentYear()}-${(this.currentMonth() + 1).toString().padStart(2, '0')}`);
  
  // Correction de l'erreur NG0600 : utilisation de getMonthData (qui est pure)
  public monthData = computed(() => this.backlogService.getMonthData(this.monthKey()));

  // Recherche indépendante pour les 4 colonnes du calendrier
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
    // Écoute les changements de monthKey et initialise de manière sûre dans LocalStorage si nécessaire
    effect(() => {
      const key = this.monthKey();
      this.backlogService.initializeMonthStructure(key);
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

  addItemDirectly(cat: CalendarCategory, game: any) {
    const d = { ...this.monthData() };
    
    // On crée un objet structuré avec le nom et l'image récupérée de l'API RAWG
    const gameItem = {
      name: game.name,
      image: game.background_image || 'assets/images/placeholder-game.jpg'
    };

    d[cat] = [...d[cat], gameItem];
    
    // Met à jour le calendrier et lance la sauvegarde LocalStorage automatique
    this.backlogService.updateMonthData(this.monthKey(), d);
    
    // Nettoyage des champs de recherche de la colonne concernée
    this.columnInputs[cat].set('');
    this.columnResults[cat].set([]);
  }

  removeItem(cat: CalendarCategory, i: number) { 
    const d = { ...this.monthData() }; 
    d[cat] = d[cat].filter((_: any, idx: number) => idx !== i); 
    
    // Met à jour le calendrier et actualise la sauvegarde locale
    this.backlogService.updateMonthData(this.monthKey(), d); 
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