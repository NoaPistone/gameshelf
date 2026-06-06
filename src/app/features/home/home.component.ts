import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BacklogService } from '../../core/services/backlog.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  public backlogService = inject(BacklogService);
  
  // Utilisation directe des signaux du service réformé
  public latestGames = this.backlogService.latestGames;
  public searchResults = this.backlogService.searchResults;
  public isSearching = this.backlogService.isSearching;

  public searchQuery = signal<string>('');

  public currentYear = signal<number>(2026);
  public currentMonth = signal<number>(5);
  public months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  
  public monthKey = computed(() => `${this.currentYear()}-${(this.currentMonth() + 1).toString().padStart(2, '0')}`);
  public monthData = computed(() => this.backlogService.getOrCreateMonthData(this.monthKey()));
  public newItemName = signal<string>('');

  onSearchChange() {
    this.backlogService.searchGames(this.searchQuery());
  }

  quickAddFromSearch(gameTitle: string) {
    const currentData = { ...this.monthData() };
    currentData.gamesBought = [...currentData.gamesBought, gameTitle];
    this.backlogService.updateMonthData(this.monthKey(), currentData);
    this.searchQuery.set('');
    this.backlogService.searchGames('');
  }

  changeMonth(delta: number) { let nm = this.currentMonth() + delta; let ny = this.currentYear(); if (nm > 11) { nm = 0; ny++; } else if (nm < 0) { nm = 11; ny--; } this.currentMonth.set(nm); this.currentYear.set(ny); }
  addItem(cat: 'gamesBought' | 'gamesStarted' | 'gamesFinished' | 'gamesPlayed100') { if (!this.newItemName().trim()) return; const d = { ...this.monthData() }; d[cat] = [...d[cat], this.newItemName().trim()]; this.backlogService.updateMonthData(this.monthKey(), d); this.newItemName.set(''); }
  removeItem(cat: 'gamesBought' | 'gamesStarted' | 'gamesFinished' | 'gamesPlayed100', i: number) { const d = { ...this.monthData() }; d[cat] = d[cat].filter((_: any, idx: number) => idx !== i); this.backlogService.updateMonthData(this.monthKey(), d); }
}