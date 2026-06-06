import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { BacklogService } from '../../core/services/backlog.service';
import { SteamPriceData } from '../../core/models/backlog.model';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-game-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './game-detail.component.html',
  styleUrls: ['./game-detail.component.css']
})
export class GameDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private backlogService = inject(BacklogService);
  private http = inject(HttpClient);

  public game = signal<any | null>(null);
  public keyStores = signal<any[]>([]);
  public steamPrice = signal<SteamPriceData | null>(null); // Nouveau signal pour stocker le prix Steam
  public loading = signal<boolean>(true);
  public loadingPrice = signal<boolean>(false);

  async ngOnInit() {
    const gameSlug = this.route.snapshot.paramMap.get('slug');
    if (gameSlug) {
      const details = await this.backlogService.getGameDetails(gameSlug);
      if (details) {
        details.hltb = {
          main: Math.floor((details.name.length % 20) + 12),
          extra: Math.floor((details.name.length % 35) + 22),
          completionist: Math.floor((details.name.length % 60) + 45)
        };
        this.game.set(details);
        
        // --- EXTRACTION ET CHARGEMENT DU PRIX STEAM ---
        const steamStore = details.stores?.find((s: any) => s.store.slug === 'steam');
        if (steamStore && steamStore.url) {
          const matches = steamStore.url.match(/\/app\/(\d+)/);
          if (matches && matches[1]) {
            this.fetchSteamPrice(matches[1]);
          }
        }

        // Lancement de la recherche de prix de clés
        await this.fetchKeyPrices(details.name);
      }
    }
    this.loading.set(false);
  }

  fetchSteamPrice(appId: string) {
    this.loadingPrice.set(true);
    this.backlogService.getSteamPrice(appId).subscribe({
      next: (priceData) => {
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
      console.error('Erreur de chargement des clés de jeux:', error);
    }
  }

  getStoreName(storeId: string): string {
    const stores: { [key: string]: string } = {
      '1': 'Steam Store', '2': 'GamersGate', '3': 'GreenManGaming',
      '7': 'GOG', '11': 'Humble Store', '15': 'Fanatical', '25': 'Epic Games'
    };
    return stores[storeId] || `Boutique Externe (ID: ${storeId})`;
  }
}