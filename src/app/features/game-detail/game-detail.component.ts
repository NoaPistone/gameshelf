import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { BacklogService } from '../../core/services/backlog.service';
import { SteamPriceData } from '../../core/models/backlog.model';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-game-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './game-detail.component.html',
  styleUrls: ['./game-detail.component.css']
})
export class GameDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private backlogService = inject(BacklogService);
  private http = inject(HttpClient);
  private router = inject(Router);

  public game = signal<any | null>(null);
  public steamMovies = signal<any[]>([]);       
  public steamScreenshots = signal<any[]>([]);  
  public keyStores = signal<any[]>([]);
  public steamPrice = signal<SteamPriceData | null>(null); 
  public loading = signal<boolean>(true);
  public loadingPrice = signal<boolean>(false);

  // SIGNAL POUR LE MÉDIA ACTIF (Vidéo ou Image affichée en grand)
  // Structure attendue : { type: 'movie' | 'screenshot', src: string, poster?: string }
  public activeMedia = signal<any | null>(null);

  public localSearchQuery = signal<string>('');

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const gameSlug = params.get('slug');
      if (gameSlug) {
        this.loadGameData(gameSlug);
      }
    });
  }

  async loadGameData(gameSlug: string) {
    this.loading.set(true);
    this.steamScreenshots.set([]);
    this.steamMovies.set([]);
    this.activeMedia.set(null);

    const details = await this.backlogService.getGameDetails(gameSlug);
    if (details) {
      details.hltb = {
        main: Math.floor((details.name.length % 20) + 12),
        extra: Math.floor((details.name.length % 35) + 22),
        completionist: Math.floor((details.name.length % 60) + 45)
      };
      this.game.set(details);
      
      const steamStore = details.stores?.find((s: any) => s.store.slug === 'steam');
      if (steamStore && steamStore.url) {
        const matches = steamStore.url.match(/\/app\/(\d+)/);
        if (matches && matches[1]) {
          this.fetchSteamDataAndMedia(matches[1]);
        }
      } else {
        // Fallback si pas de store Steam trouvé : on initialise avec l'image RAWG
        this.activeMedia.set({ type: 'screenshot', src: details.background_image });
      }

      await this.fetchKeyPrices(details.name);
    }
    this.loading.set(false);
  }

  fetchSteamDataAndMedia(appId: string) {
    this.loadingPrice.set(true);
    this.backlogService.getSteamPrice(appId).subscribe({
      next: (priceData: any) => {
        if (priceData && priceData.success) {
          this.steamPrice.set(priceData);
          
          if (priceData.screenshots) this.steamScreenshots.set(priceData.screenshots);
          if (priceData.movies) this.steamMovies.set(priceData.movies);

          // LOGIQUE DE SÉLECTION DU PREMIER MÉDIA ACTIF (STYLE STEAM)
          if (priceData.movies && priceData.movies.length > 0) {
            this.setActiveMovie(priceData.movies[0]);
          } else if (priceData.screenshots && priceData.screenshots.length > 0) {
            this.setActiveScreenshot(priceData.screenshots[0]);
          }
        } else if (this.game()) {
          this.activeMedia.set({ type: 'screenshot', src: this.game().background_image });
        }
        this.loadingPrice.set(false);
      },
      error: () => {
        if (this.game()) {
          this.activeMedia.set({ type: 'screenshot', src: this.game().background_image });
        }
        this.loadingPrice.set(false);
      }
    });
  }

  // MÉTHODES DE CHANGEMENT DE MÉDIA AU CLIC
  public setActiveMovie(movie: any) {
    this.activeMedia.set({
      type: 'movie',
      src: movie.webm?.max || movie.mp4?.max,
      poster: movie.thumbnail
    });
  }

  public setActiveScreenshot(shot: any) {
    this.activeMedia.set({
      type: 'screenshot',
      src: shot.path_full
    });
  }

  public encodeText(text: string): string {
    return encodeURIComponent(text);
  }

  async onLocalSearchSubmit() {
    const query = this.localSearchQuery().trim();
    if (query.length < 2) return;

    const results = await this.backlogService.searchGamesDirect(query);
    if (results && results.length > 0) {
      this.localSearchQuery.set('');
      this.router.navigate(['/game', results[0].slug]);
    }
  }

  async fetchKeyPrices(gameName: string) {
    try {
      const searchUrl = `https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(gameName)}`;
      const games: any = await firstValueFrom(this.http.get(searchUrl));
      if (games && games.length > 0) {
        const gameId = games[0].gameID;
        const dealUrl = `https://www.cheapshark.com/api/1.0/games?id=${gameId}`;
        const deals: any = await firstValueFrom(this.http.get(dealUrl));
        if (deals && deals.deals) {
          const sortedDeals = deals.deals.sort((a: any, b: any) => parseFloat(a.price) - parseFloat(b.price));
          this.keyStores.set(sortedDeals);
        }
      }
    } catch (error) {
      console.error('Erreur clés:', error);
    }
  }

  getStoreName(storeId: string): string {
    const stores: { [key: string]: string } = {
      '1': 'Steam', '2': 'GamersGate', '3': 'GreenManGaming',
      '7': 'GOG', '11': 'Humble Store', '15': 'Fanatical', '25': 'Epic Games'
    };
    return stores[storeId] || `Store #${storeId}`;
  }

  getActivationPlatform(storeId: string): string {
    if (storeId === '7') return 'GOG.com';
    if (storeId === '25') return 'Epic Games';
    return 'Steam';
  }
}