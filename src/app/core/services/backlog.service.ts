import { Injectable, signal, computed } from '@angular/core';
import { Game, GamePack, CalendarMonthData, SteamNews } from '../models/backlog.model';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class BacklogService {
  // --- ÉTATS GLOBAUX (Signals) ---
  public globalLibrary = signal<Game[]>([]);
  public packs = signal<GamePack[]>([]);
  public calendarData = signal<Record<string, CalendarMonthData>>({});
  
  // --- DONNÉES MOCKÉES (Actualités) ---
  public steamNews = signal<SteamNews[]>([
    { id: '1', title: 'Elden Ring: Shadow of the Erdtree disponible !', date: '2026-06-20', imageUrl: 'https://picsum.photos/800/400?random=1', summary: 'Le nouveau DLC de FromSoftware bat tous les records de connexion simultanée.' },
    { id: '2', title: 'Hollow Knight: Silksong sort enfin de l\'ombre', date: '2026-06-15', imageUrl: 'https://picsum.photos/800/400?random=2', summary: 'Team Cherry annonce une bêta fermée surprise pour la fin du mois.' }
  ]);

  constructor() {
    this.initMockData();
  }

  private initMockData() {
    // Initialisation d'une bibliothèque de base
    const baseGames: Game[] = [
      { id: 'g1', title: 'The Witcher 3', developer: 'CD Projekt', status: 'Fini', hltbMain: 50 },
      { id: 'g2', title: 'Cyberpunk 2077', developer: 'CD Projekt', status: 'En cours', hltbMain: 25 },
      { id: 'g3', title: 'Hades II', developer: 'Supergiant Games', status: 'À faire', hltbMain: 20 }
    ];
    this.globalLibrary.set(baseGames);

    // Initialisation du calendrier pour Juin 2026
    this.calendarData.set({
      '2026-06': {
        monthKey: '2026-06',
        gamesBought: ['Hades II', 'Doom Dark Ages'],
        gamesStarted: ['Cyberpunk 2077'],
        gamesFinished: ['The Witcher 3'],
        gamesPlayed100: ['Portal']
      }
    });
  }

  // --- GESTION DES PACKS ---
  addPack(name: string) {
    const newPack: GamePack = { id: 'pack_' + Date.now(), name, games: [] };
    this.packs.update(p => [...p, newPack]);
  }

  updateGameStatusInPack(packId: string, gameId: string, newStatus: Game['status']) {
    this.packs.update(allPacks => allPacks.map(p => {
      if (p.id === packId) {
        return {
          ...p,
          games: p.games.map(g => g.id === gameId ? { ...g, status: newStatus } : g)
        };
      }
      return p;
    }));
  }

  // --- SIMULATION IA / OCR ---
  public simulateOCRFromImage(file: File): Promise<string[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulation de détection de titres sur une capture d'écran Steam
        resolve(['Hollow Knight', 'Baldur\'s Gate 3', 'Celeste', 'Death Stranding']);
      }, 1200);
    });
  }

  // Intégration IA spécifique à un Pack
  async importImageToPack(packId: string, file: File) {
    const detectedTitles = await this.simulateOCRFromImage(file);
    const newGames: Game[] = detectedTitles.map((title, index) => ({
      id: `ocr_${Date.now()}_${index}`,
      title,
      status: 'À faire'
    }));

    this.packs.update(allPacks => allPacks.map(p => {
      if (p.id === packId) {
        return { ...p, games: [...p.games, ...newGames] };
      }
      return p;
    }));
  }

  // --- TRAITEMENT EXCEL ---
  importExcelData(file: File): Promise<Partial<Game>[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

          const mappedGames: Partial<Game>[] = jsonData.map(row => ({
            title: row['Nom du jeu'] || row['Title'],
            developer: row['Développeur'] || row['Developer'],
            publisher: row['Éditeur'] || row['Publisher'],
            hltbMain: Number(row['HLTB Main Story']) || 0,
            hltbExtra: Number(row['HLTB Main+Extra']) || 0,
            hltbCompletionist: Number(row['HLTB Completionist']) || 0
          }));
          resolve(mappedGames);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // --- GESTION DU CALENDRIER ---
  getOrCreateMonthData(monthKey: string): CalendarMonthData {
    const current = this.calendarData();
    if (current[monthKey]) {
      return current[monthKey];
    }
    return { monthKey, gamesBought: [], gamesStarted: [], gamesFinished: [], gamesPlayed100: [] };
  }

  updateMonthData(monthKey: string, data: CalendarMonthData) {
    this.calendarData.update(current => ({
      ...current,
      [monthKey]: data
    }));
  }
}