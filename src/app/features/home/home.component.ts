import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BacklogService } from '../../core/services/backlog.service';
import { Router, RouterModule } from '@angular/router'; 

@Component({
  selector: 'app-home',
  standalone: true,
  // CORRECTION CRITIQUE : Ajout de RouterModule pour que la navigation fonctionne
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

  // Gestion du calendrier
  public currentYear = signal<number>(2026);
  public currentMonth = signal<number>(5);
  public months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  public monthKey = computed(() => `${this.currentYear()}-${(this.currentMonth() + 1).toString().padStart(2, '0')}`);
  public monthData = computed(() => this.backlogService.getOrCreateMonthData(this.monthKey()));

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

  // État pour la modale "Fiche Steam / HLTB" (optionnel si vous basculez tout sur la page)
  public selectedGameDetails = signal<any | null>(null);
  public isModalLoading = signal<boolean>(false);

  onSearchChange() {
    this.backlogService.searchGames(this.searchQuery());
  }

  // Déclenché à chaque lettre tapée dans une colonne du calendrier
  async onColumnSearchChange(cat: 'gamesBought' | 'gamesStarted' | 'gamesFinished' | 'gamesPlayed100') {
    const query = this.columnInputs[cat]();
    if (query.trim().length < 2) {
      this.columnResults[cat].set([]);
      return;
    }
    const res = await this.backlogService.searchGamesDirect(query);
    this.columnResults[cat].set(res);
  }

  // MODIFICATION : Utilise maintenant le slug (ex: cyberpunk-2077) pour une belle URL
  openGameDetails(slug: string) {
    this.router.navigate(['/game', slug]);
  }

  closeModal() {
    this.selectedGameDetails.set(null);
  }

  // Ajout depuis la barre principale ou les suggestions
  quickAddFromSearch(gameTitle: string) {
    this.addItemDirectly('gamesBought', gameTitle);
    this.searchQuery.set('');
    this.backlogService.searchGames('');
  }

  addItemDirectly(cat: 'gamesBought' | 'gamesStarted' | 'gamesFinished' | 'gamesPlayed100', title: string) {
    const d = { ...this.monthData() };
    d[cat] = [...d[cat], title];
    this.backlogService.updateMonthData(this.monthKey(), d);
    // Reset de la recherche de colonne
    this.columnInputs[cat].set('');
    this.columnResults[cat].set([]);
  }

  changeMonth(delta: number) { let nm = this.currentMonth() + delta; let ny = this.currentYear(); if (nm > 11) { nm = 0; ny++; } else if (nm < 0) { nm = 11; ny--; } this.currentMonth.set(nm); this.currentYear.set(ny); }
  removeItem(cat: 'gamesBought' | 'gamesStarted' | 'gamesFinished' | 'gamesPlayed100', i: number) { const d = { ...this.monthData() }; d[cat] = d[cat].filter((_, idx) => idx !== i); this.backlogService.updateMonthData(this.monthKey(), d); }
}