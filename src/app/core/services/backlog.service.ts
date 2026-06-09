import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SteamPriceData, Game, GamePack } from '../models/backlog.model';
import { AuthService } from './auth'; 

/**
 * CONFIGURATION DE L'API CLOUD SUPABASE
 * -------------------------------------------------------------------------------------
 * SUPABASE_URL : Point d'accès unique vers l'instance de ta base de données PostgreSQL.
 * SUPABASE_KEY : Clé d'API publique anonyme permettant d'effectuer des opérations d'authentification
 * et de requêtage sécurisées par Row Level Security (RLS).
 */
const SUPABASE_URL = 'https://ltkmkaridmxmmyuicgmi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0a21rYXJpZG14bW15dWljZ21pIiwicm9sZSI6Imam9uIiwiaWF0IjoxNzgwODE3Mjk0LCJleHAiOjIwOTYzOTMyOTR9.pY-14aM__yZkGdH07uuYNw6YJVYdi0mCU4bsPLAUCPA';

@Injectable({
  providedIn: 'root' // Déclare le service comme Singleton disponible dans l'intégralité de l'application
})
export class BacklogService {
  // --- INJECTIONS DE DEPENDANCES (Syntaxe moderne Angular via inject()) ---
  private http = inject(HttpClient);        // Client HTTP Angular pour interroger les APIs tierces (RAWG, Proxy)
  private authService = inject(AuthService);  // Service d'authentification pour connaître le profil utilisateur connecté
  private supabase: SupabaseClient;          // Instance locale contenant les méthodes du SDK Supabase

  // --- CONFIGURATIONS DES ENDPOINTS ET IDENTIFIANTS RE-UTILISABLES ---
  private apiKey = '751a79579994490aaa29bf0f1bd944a8'; // Clé d'accès obligatoire demandée par RAWG
  private baseUrl = 'https://api.rawg.io/api';         // URL racine de l'API de base de données de jeux vidéo
  private proxyUrl = 'http://localhost:3000/api';      // URL de ton serveur proxy Node (évite les blocages CORS de l'API Steam)

  // --- SIGNALS PUBLICS ET REACTIFS (Consommés par les composants HTML) ---
  public latestGames = signal<any[]>([]);      // Stocke les 4 derniers jeux sortis pour l'affichage vitrine
  public searchResults = signal<any[]>([]);    // Contient les résultats de la recherche en cours, enrichis des prix Steam
  public isSearching = signal<boolean>(false);  // Flag d'état pour piloter l'affichage des spinners de chargement
  
  public globalLibrary = signal<Game[]>([]);    // Tableau contenant la bibliothèque globale de l'utilisateur
  public packs = signal<GamePack[]>([]);        // Liste complète des compilations de jeux créées par l'utilisateur

  /**
   * STRUCTURE DE DONNÉES PAR DÉFAUT (Modèle vierge)
   * Fournit l'arborescence de base d'un mois de calendrier lorsqu'il n'existe aucun historique
   * en base de données pour la période sélectionnée.
   */
  private defaultMonthStructure = { gamesBought: [], gamesStarted: [], gamesFinished: [], gamesPlayed100: [] };

  constructor() {
    // Initialise la passerelle de communication avec Supabase
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    // Lance immédiatement la récupération asynchrone des nouveautés pour nourrir la page d'accueil
    this.fetchLatestGames();
  }

  /**
   * INTERROGATION DU PROXY STEAM : PRIX INDIVIDUEL
   * @param appId L'identifiant numérique du jeu sur le magasin de Valve
   * @returns Un flux (Observable) contenant les structures tarifaires détaillées
   */
  public getSteamPrice(appId: string | number): Observable<SteamPriceData> {
    return this.http.get<SteamPriceData>(`${this.proxyUrl}/steam-price/${appId}`);
  }

  /**
   * INTERROGATION DU PROXY STEAM : FLUX EN VRAC (BULK)
   * Permet d'optimiser les performances en évitant d'envoyer 8 requêtes HTTP séparées.
   * @param appIds Tableau contenant la liste des identifiants Steam à chercher simultanément
   */
  public getBulkSteamPrices(appIds: number[]): Observable<any> {
    return this.http.post<any>(`${this.proxyUrl}/steam-prices/bulk`, { appIds });
  }

  /**
   * LECTURE DES DONNÉES MENSUELLES (CLOUD / DATABASE)
   * Rapatrie le JSON de configuration du backlog d'un mois spécifique depuis la table Supabase.
   * @param monthKey Chaîne de caractères servant d'identifiant au mois (Format attendu : 'YYYY-MM')
   */
  public async getMonthData(monthKey: string): Promise<any> {
    const user = this.authService.currentUser();
    
    // Si aucun utilisateur n'est identifié (mode invité), on retourne une structure vide par sécurité
    if (!user) {
      return { ...this.defaultMonthStructure };
    }

    // Interrogation de la table 'backlogs' filtrée par utilisateur et par clé temporelle
    const { data, error } = await this.supabase
      .from('backlogs')
      .select('data')
      .eq('user_id', user.id)
      .eq('month_key', monthKey)
      .single(); // Demande explicitement une seule ligne en retour

    // Gestion des erreurs d'infrastructure (On ignore le code PGRST116 qui indique juste que la ligne n'est pas encore créée)
    if (error && error.code !== 'PGRST116') {
      console.error("Erreur récupération Supabase :", error.message);
    }

    // Si une ligne est retournée, on renvoie son champ JSON interne 'data', sinon la structure vierge
    return data ? data.data : { ...this.defaultMonthStructure };
  }

  /**
   * SAUVEGARDE ET SYNCHRONISATION DU BACKLOG MENSUEL (CLOUD / DATABASE)
   * @param monthKey Identifiant du mois ciblé (ex: '2026-06')
   * @param newData Objet JSON restructuré représentant l'état à jour des 4 colonnes du calendrier
   */
  public async updateMonthData(monthKey: string, newData: any) {
    const user = this.authService.currentUser();

    if (!user) {
      console.warn("Tentative de sauvegarde sans être connecté.");
      return;
    }

    // L'instruction 'upsert' effectue automatiquement un INSERT si la ligne n'existe pas, ou un UPDATE si elle existe déjà
    const { error } = await this.supabase
      .from('backlogs')
      .upsert({
        user_id: user.id,      // Clé étrangère pointant vers la table auth.users de Supabase
        month_key: monthKey,    // Index de ciblage temporel
        data: newData,          // Enregistrement du payload JSON complet des listes de jeux
        updated_at: new Date().toISOString() // Horodatage au format ISO standardisé
      }, {
        onConflict: 'user_id,month_key' // Clé composite : indique à Supabase de surveiller ce duo pour détecter les conflits et écraser proprement
      });

    if (error) {
      console.error("Erreur sauvegarde Supabase :", error.message);
    }
  }

  /**
   * CRÉATION D'UN NOUVEAU PACK DE JEUX PERSONNALISÉ
   * @param name Intitulé du pack saisi par l'utilisateur
   */
  public addPack(name: string) {
    if (!name.trim()) return; // Protection contre les saisies d'espaces vides
    
    // Instanciation du moule GamePack avec un ID généré dynamiquement sur le timestamp actuel
    const newPack: GamePack = { id: 'pack_' + Date.now(), name: name, games: [] };
    
    // Propagation réactive de la mise à jour via l'opérateur de décomposition (spread operator)
    this.packs.set([...this.packs(), newPack]);
  }

  /**
   * MUTATION DU STATUT D'UN JEU INCLUS DANS UN PACK SPÉCIFIQUE
   * Parcours l'arborescence mémoire pour modifier l'état d'avancement d'un titre sélectionné.
   */
  public updateGameStatusInPack(packId: string, gameId: string | number, status: string) {
    const updatedPacks = this.packs().map(pack => {
      if (pack.id === packId) {
        // Parcours et map les jeux inclus dans le pack ciblé pour appliquer le nouveau statut
        const updatedGames = pack.games.map(game => game.id === gameId ? { ...game, status } : game);
        return { ...pack, games: updatedGames };
      }
      return pack; // Retourne le pack inchangé s'il ne correspond pas au pack ciblé
    });
    
    // Notification du signal pour forcer le rafraîchissement des templates HTML connectés
    this.packs.set(updatedPacks);
  }

  /**
   * ALGORITHME RECHERCHE GLOBALE ET ENRICHISSEMENT AVEC MULTI-APIS CROSS-OVER
   * @param query Chaîne de caractères saisie dans la barre de recherche
   */
  async searchGames(query: string) {
    if (!query.trim()) {
      this.searchResults.set([]);
      return;
    }
    this.isSearching.set(true); // Active l'interface visuelle d'attente
    try {
      // 1. Requête HTTP vers RAWG : Tri par pertinence décroissante et limitation à 15 résultats bruts
      const url = `${this.baseUrl}/games?key=${this.apiKey}&search=${encodeURIComponent(query)}&ordering=-added&page_size=15`;
      const response: any = await firstValueFrom(this.http.get(url)); // Convertit l'Observable en Promesse résolue
      const rawResults = response.results || [];

      // Filtrage Javascript strict pour éliminer les faux positifs n'incluant pas exactement les mots clés
      const strictResults = rawResults.filter((game: any) => 
        game.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8); // On restreint le lot final à 8 cartes pour l'affichage graphique

      const appIdsList: number[] = [];

      // 2. Recherche et extraction des IDs de l'écosystème Steam dissimulés dans les configurations de magasins RAWG
      strictResults.forEach((game: any) => {
        const steamStore = game.stores?.find((s: any) => s.store.slug === 'steam');
        if (steamStore && steamStore.url) {
          // Utilisation d'une Expression Régulière (RegEx) pour capturer la suite numérique présente après "/app/"
          const matches = steamStore.url.match(/\/app\/(\d+)/);
          if (matches && matches[1]) {
            const appId = parseInt(matches[1], 10);
            game.steamAppId = appId;     // Mutation temporaire de l'objet pour y injecter l'identifiant extrait
            appIdsList.push(appId);      // Accumulation dans la liste globale pour l'appel de lot
          }
        }
      });

      // 3. Injection en cascade des données tarifaires en temps réel si des correspondances Steam existent
      if (appIdsList.length > 0) {
        const prices = await firstValueFrom(this.getBulkSteamPrices(appIdsList));
        strictResults.forEach((game: any) => {
          // Si le dictionnaire de prix renvoyé par le Proxy contient l'AppID du jeu, on l'injecte
          if (game.steamAppId && prices[game.steamAppId]) {
            game.steamPrice = prices[game.steamAppId]; // Fusion du modèle SteamPriceData dans la structure du jeu
          }
        });
      }

      // Transmission définitive du lot enrichi au composant graphique
      this.searchResults.set(strictResults);
    } catch (error) {
      console.error('Erreur de recherche globale:', error);
    } finally {
      this.isSearching.set(false); // Extinction systématique du spinner de recherche
    }
  }

  /**
   * RECHERCHE DIRECTE LIGHT (Sans injection de prix Steam)
   * Destinée à alimenter les champs de saisie prédictifs ou d'autocomplétion rapides.
   */
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

  /**
   * CHARGEMENT DE LA VITRINE D'ACCUEIL
   * Extrait les 4 productions de jeux vidéo les plus récentes référencées sur RAWG.
   */
  async fetchLatestGames() {
    try {
      const url = `${this.baseUrl}/games?key=${this.apiKey}&ordering=-released&page_size=4`;
      const response: any = await firstValueFrom(this.http.get(url));
      this.latestGames.set(response.results || []);
    } catch (error) {
      console.error('Erreur nouveautés:', error);
    }
  }

  /**
   * REQUÊTE FICHE COMPLÈTE
   * Extrait l'intégralité des attributs d'un jeu (développeurs, synopsis, plateformes) à partir de son slug unique.
   */
  async getGameDetails(slug: string): Promise<any | null> {
    try {
      const url = `${this.baseUrl}/games/${slug}?key=${this.apiKey}`;
      return await firstValueFrom(this.http.get(url));
    } catch (error) {
      return null;
    }
  }

  /**
   * RE-AFFFFECTATION DE LA BIBLIOTHÈQUE GLOBALE
   */
  public updateGlobalLibrary(games: Game[]) {
    this.globalLibrary.set(games);
    // TODO: Mettre en place la passerelle d'écriture vers la table Supabase dédiée aux profils utilisateurs
  }

  // =====================================================================================
  // --- FONCTIONS ASYNCHRONES DE SIMULATION (Mocks de traitement de fichiers) ---
  // =====================================================================================

  /**
   * SIMULATION PARSEUR EXCEL (.xlsx)
   */
  async importExcelData(file: File): Promise<Game[]> {
    console.log("Fichier Excel reçu :", file.name);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { id: 'xl_' + Date.now(), name: 'Jeu Importé Excel', status: 'À faire' }
        ]);
      }, 1000); // Imite un délai d'analyse d'une seconde
    });
  }

  /**
   * SIMULATION RECONNAISSANCE OPTIQUE DE CARACTERES (OCR - Jaquette globale)
   */
  async simulateOCRFromImage(file: File): Promise<Game[]> {
    console.log("Image reçue pour OCR globale :", file.name);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { id: 'ocr_' + Date.now(), name: 'Jeu Détecté via OCR', status: 'À faire' }
        ]);
      }, 1500); // Imite le temps d'exécution d'un moteur de vision par ordinateur
    });
  }

  /**
   * SIMULATION OCR APPLIQUÉE ET REDIRIGÉE VERS UN PACK CIBLÉ
   */
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
        resolve();
      }, 1500);
    });
  }
}