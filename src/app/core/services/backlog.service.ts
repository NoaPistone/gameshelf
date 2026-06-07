import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { SteamPriceData, Game, GamePack} from '../models/backlog.model';
import {  } from '../models/backlog.model';

@Injectable({
  providedIn: 'root'
})
export class BacklogService {
  private apiKey = '751a79579994490aaa29bf0f1bd944a8';
  private baseUrl = 'https://api.rawg.io/api';
  private proxyUrl = 'http://localhost:3000/api';

  public latestGames = signal<any[]>([]);
  public searchResults = signal<any[]>([]);
  public isSearching = signal<boolean>(false);
  private calendarData = signal<{ [key: string]: any }>({});
  public globalLibrary = signal<Game[]>([]);
  public packs = signal<GamePack[]>([]);

  constructor(private http: HttpClient) {
    this.loadFromLocalStorage();
    this.fetchLatestGames();
  }

  public getSteamPrice(appId: string | number): Observable<SteamPriceData> {
    return this.http.get<SteamPriceData>(`${this.proxyUrl}/steam-price/${appId}`);
  }

  public getBulkSteamPrices(appIds: number[]): Observable<any> {
    return this.http.post<any>(`${this.proxyUrl}/steam-prices/bulk`, { appIds });
  }

  private loadFromLocalStorage() {
    const savedCalendar = localStorage.getItem('gameshelf_backlog_data');
    if (savedCalendar) {
      try { this.calendarData.set(JSON.parse(savedCalendar)); } catch (e) { this.calendarData.set({}); }
    }
    const savedLibrary = localStorage.getItem('gameshelf_global_library');
    if (savedLibrary) {
      try { this.globalLibrary.set(JSON.parse(savedLibrary)); } catch (e) { this.globalLibrary.set([]); }
    }
    const savedPacks = localStorage.getItem('gameshelf_packs');
    if (savedPacks) {
      try { this.packs.set(JSON.parse(savedPacks)); } catch (e) { this.packs.set([]); }
    }
  }

  private saveCalendarToLocalStorage() {
    localStorage.setItem('gameshelf_backlog_data', JSON.stringify(this.calendarData()));
  }
  private saveLibraryToLocalStorage() {
    localStorage.setItem('gameshelf_global_library', JSON.stringify(this.globalLibrary()));
  }
  private savePacksToLocalStorage() {
    localStorage.setItem('gameshelf_packs', JSON.stringify(this.packs()));
  }

  public getMonthData(monthKey: string) {
    const current = this.calendarData();
    return current[monthKey] || { gamesBought: [], gamesStarted: [], gamesFinished: [], gamesPlayed100: [] };
  }

  public initializeMonthStructure(monthKey: string) {
    const current = this.calendarData();
    if (!current[monthKey]) {
      current[monthKey] = { gamesBought: [], gamesStarted: [], gamesFinished: [], gamesPlayed100: [] };
      this.calendarData.set({ ...current });
      this.saveCalendarToLocalStorage();
    }
  }

  public updateMonthData(monthKey: string, newData: any) {
    const current = this.calendarData();
    current[monthKey] = newData;
    this.calendarData.set({ ...current });
    this.saveCalendarToLocalStorage();
  }

  public addPack(name: string) {
    if (!name.trim()) return;
    const newPack: GamePack = { id: 'pack_' + Date.now(), name: name, games: [] };
    this.packs.set([...this.packs(), newPack]);
    this.savePacksToLocalStorage();
  }

  public updateGameStatusInPack(packId: string, gameId: string | number, status: string) {
    const updatedPacks = this.packs().map(pack => {
      if (pack.id === packId) {
        const updatedGames = pack.games.map(game => game.id === gameId ? { ...game, status } : game);
        return { ...pack, games: updatedGames };
      }
      return pack;
    });
    this.packs.set(updatedPacks);
    this.savePacksToLocalStorage();
  }

  // --- RECHERCHE AVEC INJECTION DES PRIX STEAM ---
  async searchGames(query: string) {
    if (!query.trim()) {
      this.searchResults.set([]);
      return;
    }
    this.isSearching.set(true);
    try {
      const url = `${this.baseUrl}/games?key=${this.apiKey}&search=${encodeURIComponent(query)}&ordering=-added&page_size=15`;
      const response: any = await firstValueFrom(this.http.get(url));
      const rawResults = response.results || [];

      const strictResults = rawResults.filter((game: any) => 
        game.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8);

      // On extrait les couples d'AppID pour chaque résultat de recherche
      const appIdsMap: { [key: number]: any } = {};
      const appIdsList: number[] = [];

      strictResults.forEach((game: any) => {
        const steamStore = game.stores?.find((s: any) => s.store.slug === 'steam');
        if (steamStore && steamStore.url) {
          const matches = steamStore.url.match(/\/app\/(\d+)/);
          if (matches && matches[1]) {
            const appId = parseInt(matches[1], 10);
            game.steamAppId = appId;
            appIdsList.push(appId);
          }
        }
      });

      // Si on a trouvé des AppIDs Steam, on va chercher leurs prix en lot
      if (appIdsList.length > 0) {
        const prices = await firstValueFrom(this.getBulkSteamPrices(appIdsList));
        strictResults.forEach((game: any) => {
          if (game.steamAppId && prices[game.steamAppId]) {
            game.steamPrice = prices[game.steamAppId];
          }
        });
      }

      this.searchResults.set(strictResults);
    } catch (error) {
      console.error('Erreur de recherche globale:', error);
    } finally {
      this.isSearching.set(false);
    }
  }

  async searchGamesDirect(query: string): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/games?key=${this.apiKey}&search=${encodeURIComponent(query)}&page_size=10`;
      const response: any = await firstValueFrom(this.http.get(url));
      return (response.results || []).filter((game: any) => 
        game.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5);
    } catch (error) {
      return [];
    }
  }

  async fetchLatestGames() {
    try {
      const url = `${this.baseUrl}/games?key=${this.apiKey}&ordering=-released&page_size=4`;
      const response: any = await firstValueFrom(this.http.get(url));
      this.latestGames.set(response.results || []);
    } catch (error) {
      console.error('Erreur nouveautés:', error);
    }
  }

  async getGameDetails(slug: string): Promise<any | null> {
    try {
      const url = `${this.baseUrl}/games/${slug}?key=${this.apiKey}`;
      return await firstValueFrom(this.http.get(url));
    } catch (error) {
      return null;
    }
  }

  // --- AJOUT : MISE A JOUR DE LA BIBLIOTHEQUE GLOBALE ---
  public updateGlobalLibrary(games: Game[]) {
    this.globalLibrary.set(games);
    localStorage.setItem('gameshelf_global_library', JSON.stringify(games));
  }

  // --- AJOUT : SIMULATION IMPORT EXCEL ---
  async importExcelData(file: File): Promise<Game[]> {
    console.log("Fichier Excel reçu :", file.name);
    // Simulation de parsing. À remplacer par ta logique XLSX si nécessaire.
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { id: 'xl_' + Date.now(), name: 'Jeu Importé Excel', status: 'À faire' }
        ]);
      }, 1000);
    });
  }

  // --- AJOUT : SIMULATION OCR ---
  async simulateOCRFromImage(file: File): Promise<Game[]> {
    console.log("Image reçue pour OCR globale :", file.name);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { id: 'ocr_' + Date.now(), name: 'Jeu Détecté via OCR', status: 'À faire' }
        ]);
      }, 1500);
    });
  }

  // --- AJOUT : SIMULATION OCR VERS UN PACK ---
  async importImageToPack(packId: string, file: File): Promise<void> {
    console.log(`Image reçue pour OCR vers le pack ${packId} :`, file.name);
    return new Promise((resolve) => {
      setTimeout(() => {
        const currentPacks = this.packs();
        const updated = currentPacks.map(p => {
          if (p.id === packId) {
            const newGame: Game = { id: 'ocr_p_' + Date.now(), name: 'Jeu Scan Pack', status: 'À faire' };
            return { ...p, games: [...p.games, newGame] };
          }
          return p;
        });
        this.packs.set(updated);
        localStorage.setItem('gameshelf_packs', JSON.stringify(updated));
        resolve();
      }, 1500);
    });
  }

}