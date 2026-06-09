import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { BacklogService } from '../../core/services/backlog.service';
import { SteamPriceData } from '../../core/models/backlog.model';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-game-detail',
  standalone: true, // Composant autonome (pas besoin de le déclarer dans un @NgModule)
  imports: [CommonModule, RouterModule], // Modules Angular requis pour le HTML (*ngIf, routerLink...)
  templateUrl: './game-detail.component.html',
  styleUrls: ['./game-detail.component.css']
})
export class GameDetailComponent implements OnInit {
  // --- INJECTIONS DE DÉPENDANCES ---
  private route = inject(ActivatedRoute);      // Permet de lire les paramètres de l'URL courante (le slug du jeu)
  private backlogService = inject(BacklogService); // Ton service centralisé (RAWG + Proxy Steam)
  private http = inject(HttpClient);            // Client HTTP pour requêter directement l'API CheapShark

  // --- SIGNALS D'ÉTAT (Gèrent la réactivité des données et du cycle de vie) ---
  public game = signal<any | null>(null);              // Stocke les métadonnées globales du jeu (RAWG)
  public keyStores = signal<any[]>([]);                // Tableau des offres de clés triées par prix
  public steamPrice = signal<SteamPriceData | null>(null); // Reçoit la structure de prix officielle de Steam
  public loading = signal<boolean>(true);              // Loader principal de la page
  public loadingPrice = signal<boolean>(false);         // Loader secondaire spécifique au tarif Steam

  /**
   * INITIALISATION DU COMPOSANT
   * S'exécute automatiquement à l'ouverture de la page.
   */
  async ngOnInit() {
    // 1. Récupération du paramètre dynamic ':slug' configuré dans ton routeur (ex: /game/the-witcher-3)
    const gameSlug = this.route.snapshot.paramMap.get('slug');
    
    if (gameSlug) {
      // 2. Appel asynchrone à RAWG via ton service pour avoir la fiche descriptive du jeu
      const details = await this.backlogService.getGameDetails(gameSlug);
      
      if (details) {
        /**
         * ALGORITHME DE MOCKING "HOW LONG TO BEAT" (HLTB)
         * Faute d'API HLTB officielle stable, on simule de manière déterministe la durée de vie
         * en se basant sur la longueur du nom du jeu (modulo) afin d'avoir toujours la même valeur pour un jeu donné.
         */
        details.hltb = {
          main: Math.floor((details.name.length % 20) + 12),
          extra: Math.floor((details.name.length % 35) + 22),
          completionist: Math.floor((details.name.length % 60) + 45)
        };
        
        // Mise à jour du signal principal
        this.game.set(details);
        
        // 3. EXTRACTION ET RECHERCHE DE L'APPID STEAM
        // On cherche si Steam fait partie des magasins référencés pour ce jeu sur RAWG
        const steamStore = details.stores?.find((s: any) => s.store.slug === 'steam');
        if (steamStore && steamStore.url) {
          // Utilisation d'une RegEx pour choper l'ID numérique situé dans l'URL du store de Valve
          const matches = steamStore.url.match(/\/app\/(\d+)/);
          if (matches && matches[1]) {
            // Si trouvé, on lance la récupération asynchrone du prix Steam (non-bloquant)
            this.fetchSteamPrice(matches[1]);
          }
        }

        // 4. RECHERCHE DES OFFRES DE CLÉS EXTERNES (Bloquant via 'await')
        await this.fetchKeyPrices(details.name);
      }
    }
    // Fin du chargement global : l'interface HTML bascule du loader vers le contenu
    this.loading.set(false);
  }

  /**
   * RÉCUPÉRATION DU PRIX DE VENTE STEAM (VIA LE PROXY NODE)
   * @param appId L'identifiant du catalogue Steam
   */
  fetchSteamPrice(appId: string) {
    this.loadingPrice.set(true); // Active le petit spinner de prix
    
    // Consommation de l'Observable fourni par le BacklogService
    this.backlogService.getSteamPrice(appId).subscribe({
      next: (priceData) => {
        // Si le proxy confirme le succès de l'extraction, on alimente notre signal
        if (priceData.success) {
          this.steamPrice.set(priceData);
        }
        this.loadingPrice.set(false);
      },
      error: (err) => {
        console.error('Erreur de récupération du prix Steam local:', err);
        this.loadingPrice.set(false);
      }
    });
  }

  /**
   * INTERROGATION DE L'API CHEAPSHARK (COMPARATEUR DE CLÉS PC)
   * Effectue un appel en deux étapes (Two-step lookup) pour récupérer et trier les offres du marché.
   * @param gameName Nom textuel du jeu à chercher
   */
  async fetchKeyPrices(gameName: string) {
    try {
      // ÉTAPE A : Traduction du Nom du jeu en un ID unique CheapShark (gameID)
      const searchUrl = `https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(gameName)}`;
      const games: any = await firstValueFrom(this.http.get(searchUrl));
      
      if (games && games.length > 0) {
        const gameId = games[0].gameID; // On extrait l'ID de la première correspondance jugée la plus pertinente
        
        // ÉTAPE B : Récupération de l'intégralité des deals (offres) associés à ce gameID
        const dealUrl = `https://www.cheapshark.com/api/1.0/games?id=${gameId}`;
        const deals: any = await firstValueFrom(this.http.get(dealUrl));
        
        if (deals && deals.deals) {
          // ALGORITHME DE TRI NUMÉRIQUE CROISSANT
          // Trie le tableau des boutiques de la moins chère à la plus chère
          const sortedDeals = deals.deals.sort((a: any, b: any) => parseFloat(a.price) - parseFloat(b.price));
          
          // Sauvegarde des résultats triés dans le signal
          this.keyStores.set(sortedDeals);
        }
      }
    } catch (error) {
      console.error('Erreur de chargement des clés de jeux:', error);
    }
  }

  /**
   * TRADUCTEUR D'IDENTIFIANTS DE BOUTIQUE (DICTIONNAIRE / MAPPING)
   * Convertit l'ID numérique renvoyé par CheapShark en chaîne de caractères lisible par un humain.
   * @param storeId ID renvoyé par l'API (ex: "1")
   * @returns Le nom officiel de la boutique (ex: "Steam Store")
   */
  getStoreName(storeId: string): string {
    const stores: { [key: string]: string } = {
      '1': 'Steam Store', 
      '2': 'GamersGate', 
      '3': 'GreenManGaming',
      '7': 'GOG', 
      '11': 'Humble Store', 
      '15': 'Fanatical', 
      '25': 'Epic Games'
    };
    // Renvoie le nom mappé, ou une valeur de secours si l'ID de la boutique est inconnu
    return stores[storeId] || `Boutique Externe (ID: ${storeId})`;
  }
}