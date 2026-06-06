import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BacklogService } from '../../core/services/backlog.service';
import { CalendarMonthData } from '../../core/models/backlog.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  private backlogService = inject(BacklogService);
  
  public news = this.backlogService.steamNews;
  
  // Gestion de la date sélectionnée
  public currentYear = signal<number>(2026);
  public currentMonth = signal<number>(5); // 0 = Janvier, 5 = Juin
  
  public months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  // Génération de la clé YYYY-MM dynamique
  public monthKey = computed(() => {
    const m = (this.currentMonth() + 1).toString().padStart(2, '0');
    return `${this.currentYear()}-${m}`;
  });

  // Récupération réactive des données du mois choisi
  public monthData = computed(() => {
    return this.backlogService.getOrCreateMonthData(this.monthKey());
  });

  // Inputs temporaires pour l'ajout rapide d'éléments textuels
  public newItemName = signal<string>('');

  changeMonth(delta: number) {
    let nextMonth = this.currentMonth() + delta;
    let nextYear = this.currentYear();

    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    } else if (nextMonth < 0) {
      nextMonth = 11;
      nextYear--;
    }
    this.currentMonth.set(nextMonth);
    this.currentYear.set(nextYear);
  }

  addItem(category: 'gamesBought' | 'gamesStarted' | 'gamesFinished' | 'gamesPlayed100') {
    if (!this.newItemName().trim()) return;

    const currentData = { ...this.monthData() };
    currentData[category] = [...currentData[category], this.newItemName().trim()];
    
    this.backlogService.updateMonthData(this.monthKey(), currentData);
    this.newItemName.set('');
  }

  removeItem(category: 'gamesBought' | 'gamesStarted' | 'gamesFinished' | 'gamesPlayed100', index: number) {
    const currentData = { ...this.monthData() };
    currentData[category] = currentData[category].filter((_, i) => i !== index);
    this.backlogService.updateMonthData(this.monthKey(), currentData);
  }
}