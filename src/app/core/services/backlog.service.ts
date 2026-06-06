import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Game, GamePack, CalendarMonthData } from '../models/backlog.model';
import { firstValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class BacklogService {
  private http = inject(HttpClient);

  // --- CONFIGURATION API RAWG ---
  private apiKey = '751a79579994490aaa29bf0f1bd944a8'; 
  private baseUrl = 'https://api.rawg.io/api';

  // --- ÉTATS GLOBAUX ---
  public globalLibrary = signal<Game[]>([]);
  public packs = signal<GamePack[]>([]);
  public calendarData = signal<Record<string, CalendarMonthData>>({});

  // Signaux pour l'accueil et la recherche API
  public latestGames = signal<any[]>([]);
  public searchResults = signal<any[]>([]);
  public isSearching = signal<boolean>(false);

  constructor() {
    this.initMockData();
    this.fetchLatestGames(); // Charge les nouveautés RAWG au démarrage
  }

  // 1. Récupérer les dernières sorties de jeux vidéo
  async fetchLatestGames() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const url = `${this.baseUrl}/games?key=${this.apiKey}&dates=2025-12-01,${today}&ordering=-released&page_size=6`;
      const response: any = await firstValueFrom(this.http.get(url));
      this.latestGames.set(response.results || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des sorties:', error);
    }
  }

  // 2. Recherche de jeux (Barre de recherche de l'accueil)
  async searchGames(query: string) {
    if (!query.trim()) {
      this.searchResults.set([]);
      return;
    }
    this.isSearching.set(true);
    try {
      const url = `${this.baseUrl}/games?key=${this.apiKey}&search=${query}&page_size=8`;
      const response: any = await firstValueFrom(this.http.get(url));
      this.searchResults.set(response.results || []);
    } catch (error) {
      console.error('Erreur pendant la recherche:', error);
    } finally {
      this.isSearching.set(false);
    }
  }

  // --- MOCK DATA (Avec hltbMain conforme à votre modèle étendu) ---
  private initMockData() {
    this.globalLibrary.set([
      { id: 'g1', title: 'The Witcher 3', developer: 'CD Projekt', status: 'Fini', hltbMain: 50 },
      { id: 'g2', title: 'Cyberpunk 2077', developer: 'CD Projekt', status: 'En cours', hltbMain: 25 },
      { id: 'g3', title: 'Hades', developer: 'Supergiant Games', status: 'À faire', hltbMain: 20 }
    ]);
    this.calendarData.set({ 
      '2026-06': { monthKey: '2026-06', gamesBought: ['Hades II'], gamesStarted: [], gamesFinished: [], gamesPlayed100: [] } 
    });
  }

  // --- GESTION DES PACKS ET UTILITAIRES ---
  addPack(name: string) { 
    const newPack: GamePack = { id: 'pack_' + Date.now(), name, games: [] }; 
    this.packs.update(p => [...p, newPack]); 
  }

  updateGameStatusInPack(packId: string, gameId: string, newStatus: Game['status']) { 
    this.packs.update(allPacks => allPacks.map((p: any) => p.id === packId ? { 
      ...p, 
      games: p.games.map((g: any) => g.id === gameId ? { ...g, status: newStatus } : g) 
    } : p)); 
  }

  simulateOCRFromImage(file: File): Promise<string[]> { 
    return new Promise((r) => setTimeout(() => r(['Hollow Knight', 'Celeste']), 1000)); 
  }

  async importImageToPack(packId: string, file: File) { 
    const titles = await this.simulateOCRFromImage(file); 
    const newGames: Game[] = titles.map((title, i) => ({ id: `ocr_${Date.now()}_${i}`, title, status: 'À faire' })); 
    this.packs.update(allPacks => allPacks.map(p => p.id === packId ? { ...p, games: [...p.games, ...newGames] } : p)); 
  }

  importExcelData(file: File): Promise<Partial<Game>[]> { 
    return new Promise((res) => res([])); 
  }

  getOrCreateMonthData(monthKey: string): CalendarMonthData { 
    const current = this.calendarData(); 
    return current[monthKey] || { monthKey, gamesBought: [], gamesStarted: [], gamesFinished: [], gamesPlayed100: [] }; 
  }

  updateMonthData(monthKey: string, data: CalendarMonthData) { 
    this.calendarData.update(current => ({ ...current, [monthKey]: data })); 
  }
}