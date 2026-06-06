import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// Interface pour typer correctement les structures de la bibliothèque
export interface Game {
  id: string | number;
  name: string;
  background_image?: string;
  status?: string;
}

export interface GamePack {
  id: string;
  name: string;
  games: Game[];
}

@Injectable({
  providedIn: 'root'
})
export class BacklogService {
  private apiKey = '751a79579994490aaa29bf0f1bd944a8';
  private baseUrl = 'https://api.rawg.io/api';

  // Signals pour le Dashboard (Home)
  public latestGames = signal<any[]>([]);
  public searchResults = signal<any[]>([]);
  public isSearching = signal<boolean>(false);

  // Données du Dashboard (Chronologie)
  private calendarData = signal<{ [key: string]: any }>({});

  // Signals pour la Bibliothèque (Library)
  public globalLibrary = signal<Game[]>([]);
  public packs = signal<GamePack[]>([]);

  constructor(private http: HttpClient) {
    this.loadFromLocalStorage();
    this.fetchLatestGames();
  }

  // --- SAUVEGARDE & CHARGEMENT LOCALSTORAGE ---
  private loadFromLocalStorage() {
    // Chargement du calendrier
    const savedCalendar = localStorage.getItem('gameshelf_backlog_data');
    if (savedCalendar) {
      try { this.calendarData.set(JSON.parse(savedCalendar)); } catch (e) { this.calendarData.set({}); }
    }

    // Chargement de la bibliothèque globale
    const savedLibrary = localStorage.getItem('gameshelf_global_library');
    if (savedLibrary) {
      try { this.globalLibrary.set(JSON.parse(savedLibrary)); } catch (e) { this.globalLibrary.set([]); }
    }

    // Chargement des packs de la bibliothèque
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

  // --- GESTION DU CALENDRIER (HOME) ---

 // --- GESTION DU CALENDRIER (HOME) ---
  
  /**
   * 1. MÉTHODE PURE (Utilisable sans risque dans un computed)
   */
  public getMonthData(monthKey: string) {
    const current = this.calendarData();
    if (!current[monthKey]) {
      return {
        gamesBought: [], // Contiendra désormais des objets { name: string, image: string }
        gamesStarted: [],
        gamesFinished: [],
        gamesPlayed100: []
      };
    }
    return current[monthKey];
  }

  /**
   * 2. INITIALISATION ASYNC / SÉCURISÉE (Appelée par un effect)
   */
  public initializeMonthStructure(monthKey: string) {
    const current = this.calendarData();
    if (!current[monthKey]) {
      current[monthKey] = {
        gamesBought: [],
        gamesStarted: [],
        gamesFinished: [],
        gamesPlayed100: []
      };
      this.calendarData.set({ ...current });
      this.saveCalendarToLocalStorage();
    }
  }

  /**
   * 3. MISE A JOUR DES DONNÉES D'UN MOIS
   */
  public updateMonthData(monthKey: string, newData: any) {
    const current = this.calendarData();
    current[monthKey] = newData;
    this.calendarData.set({ ...current });
    this.saveCalendarToLocalStorage();
  }

  // --- GESTION DE LA BIBLIOTHÈQUE & PACKS (LIBRARY) ---
  public addPack(name: string) {
    if (!name.trim()) return;
    const newPack: GamePack = {
      id: 'pack_' + Date.now(),
      name: name,
      games: []
    };
    this.packs.set([...this.packs(), newPack]);
    this.savePacksToLocalStorage();
  }

  public updateGameStatusInPack(packId: string, gameId: string | number, status: string) {
    const updatedPacks = this.packs().map(pack => {
      if (pack.id === packId) {
        const updatedGames = pack.games.map(game => {
          if (game.id === gameId) {
            return { ...game, status: status };
          }
          return game;
        });
        return { ...pack, games: updatedGames };
      }
      return pack;
    });
    this.packs.set(updatedPacks);
    this.savePacksToLocalStorage();
  }

  // Simulation d'import Excel
  public async importExcelData(file: File): Promise<Partial<Game>[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { id: 'ex_1', name: 'The Witcher 3: Wild Hunt' },
          { id: 'ex_2', name: 'Cyberpunk 2077' },
          { id: 'ex_3', name: 'Red Dead Redemption 2' }
        ]);
      }, 1000);
    });
  }

  // Simulation OCR depuis une image
  public async simulateOCRFromImage(file: File): Promise<string[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(['Elden Ring', 'Hades', 'Hollow Knight']);
      }, 1200);
    });
  }

  // Import direct d'une image dans un pack
  public async importImageToPack(packId: string, file: File): Promise<void> {
    const titles = await this.simulateOCRFromImage(file);
    const mockGames: Game[] = titles.map((title, index) => ({
      id: `ocr_${Date.now()}_${index}`,
      name: title,
      background_image: 'assets/images/mock-game.jpg',
      status: 'À faire'
    }));

    const updatedPacks = this.packs().map(pack => {
      if (pack.id === packId) {
        return { ...pack, games: [...pack.games, ...mockGames] };
      }
      return pack;
    });

    this.packs.set(updatedPacks);
    this.savePacksToLocalStorage();
  }

  // Mettre à jour la bibliothèque globale complète (utilisée lors des imports réussis)
  public updateGlobalLibrary(games: Game[]) {
    this.globalLibrary.set(games);
    this.saveLibraryToLocalStorage();
  }

  // --- RECHERCHE ET APPELS API RAWG POPULAIRES ---
  // --- RECHERCHE ET APPELS API RAWG POPULAIRES ---
  
  // 1. Pour la barre de recherche PRINCIPALE
  async searchGames(query: string) {
    if (!query.trim()) {
      this.searchResults.set([]);
      return;
    }
    this.isSearching.set(true);
    try {
      const url = `${this.baseUrl}/games?key=${this.apiKey}&search=${encodeURIComponent(query)}&ordering=-added&page_size=20`; // On augmente la page_size pour avoir plus de choix à filtrer
      const response: any = await firstValueFrom(this.http.get(url));
      const rawResults = response.results || [];

      // FILTRE STRICT : Le nom du jeu doit contenir EXACTEMENT la query (en minuscules)
      const strictResults = rawResults.filter((game: any) => 
        game.name.toLowerCase().includes(query.toLowerCase())
      );

      // On ne garde que les 8 premiers résultats filtrés
      this.searchResults.set(strictResults.slice(0, 8));
    } catch (error) {
      console.error('Erreur de recherche globale:', error);
    } finally {
      this.isSearching.set(false);
    }
  }

  // 2. Pour les barres de recherche DES COLONNES du calendrier
  async searchGamesDirect(query: string): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/games?key=${this.apiKey}&search=${encodeURIComponent(query)}&ordering=-added&page_size=20`;
      const response: any = await firstValueFrom(this.http.get(url));
      const rawResults = response.results || [];

      // FILTRE STRICT : Même logique ici
      const strictResults = rawResults.filter((game: any) => 
        game.name.toLowerCase().includes(query.toLowerCase())
      );

      return strictResults.slice(0, 5);
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
}