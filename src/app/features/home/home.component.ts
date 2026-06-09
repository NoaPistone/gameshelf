import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BacklogService } from '../../core/services/backlog.service';
import { AuthService } from '../../core/services/auth'; 
import { Router, RouterModule } from '@angular/router'; 

// Définition d'un type strict représentant exclusivement les 4 colonnes de ton Kanban de suivi
export type CalendarCategory = 'gamesBought' | 'gamesStarted' | 'gamesFinished' | 'gamesPlayed100';

@Component({
  selector: 'app-home',
  standalone: true, // Composant autonome embarquant ses propres modules graphiques
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  // --- INJECTIONS DES SERVICES CENTRALISÉS ---
  public backlogService = inject(BacklogService); // Accès aux requêtes API RAWG et au proxy de prix
  private authService = inject(AuthService);        // Ecoute de l'état de la session Google/Supabase
  private router = inject(Router);                  // Outil de routage pour naviguer programmatiquement entre les vues

  // --- REPREND LES SIGNALS EXPOSÉS PAR LE BACKLOG SERVICE ---
  public latestGames = this.backlogService.latestGames;
  public searchResults = this.backlogService.searchResults;
  public isSearching = this.backlogService.isSearching;
  
  // Champ de saisie lié à la barre de recherche principale du site (Recherche Globale)
  public searchQuery = signal<string>('');

  // --- CONFIGURATION ET NAVIGATION DU CALENDRIER TEMPOREL ---
  public currentYear = signal<number>(2026);
  public currentMonth = signal<number>(5); // Initialisé à 5 (Index de Juin dans un tableau de 0 à 11)
  public months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  
  // Itérateur exploité dans le HTML (*ngFor) pour générer dynamiquement l'ossature des 4 colonnes
  public calendarCategories: CalendarCategory[] = ['gamesBought', 'gamesStarted', 'gamesFinished', 'gamesPlayed100'];

  /**
   * LE SIGNAL CALCULÉ (computed) : CLÉ TEMPORELLE COMPOSITE
   * Combine l'année et le mois en cours pour forger l'ID unique de ciblage dans ta BDD.
   * La fonction padStart(2, '0') transforme par exemple l'index 5 (+1) en chaîne propre "06".
   * Résultat généré automatiquement : "2026-06"
   */
  public monthKey = computed(() => `${this.currentYear()}-${(this.currentMonth() + 1).toString().padStart(2, '0')}`);
  
  // Conteneur d'état contenant le JSON structurel du mois récupéré depuis Supabase
  public monthData = signal<any>({ gamesBought: [], gamesStarted: [], gamesFinished: [], gamesPlayed100: [] });

  /**
   * STRUCTURE DE RECHERCHE DÉDIÉE PAR COLONNE
   * Évite les conflits : chaque colonne possède sa propre mémoire tampon isolée
   * pour sa barre de saisie interne et son menu déroulant de propositions auto-prédictives.
   */
  public columnInputs = {
    gamesBought: signal<string>(''),
    gamesStarted: signal<string>(''),
    gamesFinished: signal<string>(''),
    gamesPlayed100: signal<string>('')
  };
  
  public columnResults = {
    gamesBought: signal<any[]>([]),
    gamesStarted: signal<any[]>([]),
    gamesFinished: signal<any[]>([]),
    gamesPlayed100: signal<any[]>([])
  };

  constructor() {
    /**
     * CONSTRUCTEUR D'EFFET DE CONTEXTE REACIF (effect)
     * Cette fonction magique s'exécute automatiquement et instantanément dès qu'une de ses dépendances change :
     * Dépendance 1 : 'monthKey()' -> L'utilisateur clique sur "Mois Suivant / Précédent"
     * Dépendance 2 : 'authService.currentUser()' -> L'utilisateur passe du mode déconnecté au mode connecté via Google
     * L'option allowSignalWrites est obligatoire car l'effet va écraser la valeur du signal 'monthData'.
     */
    effect(async () => {
      const key = this.monthKey();
      const user = this.authService.currentUser(); 
      
      // Requête asynchrone pour extraire le JSON correspondant à la clé temporelle active
      const data = await this.backlogService.getMonthData(key);
      this.monthData.set(data); // Rafraîchit immédiatement l'interface avec les cartes du nouveau mois
    }, { allowSignalWrites: true });
  }

  /**
   * ACTION : DECLENCHEMENT DE LA RECHERCHE GENERALE EN HAUT DE PAGE
   * Relié à l'écouteur (input) ou (keyup) de ta barre principale.
   */
  onSearchChange() {
    this.backlogService.searchGames(this.searchQuery());
  }

  /**
   * ACTION : RECHERCHE FLASH INTÉGRÉE AUX COLONNES
   * Recherche simplifiée et rapide (sans récupération de prix Steam) pour ajouter un titre à la volée.
   * @param cat La colonne émettrice de la saisie ('gamesBought', 'gamesStarted'...)
   */
  async onColumnSearchChange(cat: CalendarCategory) {
    const query = this.columnInputs[cat]();
    
    // Protection anti-surcharge : Ne lance la requête à RAWG qu'à partir de 2 caractères tapés
    if (query.trim().length < 2) {
      this.columnResults[cat].set([]);
      return;
    }
    const res = await this.backlogService.searchGamesDirect(query);
    this.columnResults[cat].set(res); // Ouvre la petite liste de suggestions sous l'input de la colonne
  }

  /**
   * NAVIGATION : ROUTAGE VERS LA FICHE DÉTAILLÉE DU JEU
   * @param slug Le nom technique standardisé du jeu (ex: "elden-ring")
   */
  openGameDetails(slug: string) {
    this.router.navigate(['/game', slug]);
  }

  /**
   * ACTION : AJOUT IMMÉDIAT D'UN JEU DANS UNE COLONNE (LOGIQUE MUTABLE AVEC RE-IMPLANTATION)
   * @param cat La catégorie cible du Kanban où pousser le jeu
   * @param game L'objet complet renvoyé par l'autocomplétion RAWG
   */
  async addItemDirectly(cat: CalendarCategory, game: any) {
    // Étape A : On clone l'état actuel du mois (Deep Copy superficielle) pour respecter l'immutabilité d'Angular
    const d = { ...this.monthData() };
    
    // Étape B : On extrait uniquement les données vitales du jeu pour ne pas surcharger le JSON en BDD
    const gameItem = {
      name: game.name,
      image: game.background_image || 'assets/images/placeholder-game.jpg'
    };

    // Étape C : Insertion réactive. On recrée le sous-tableau en y injectant le nouvel élément à la fin
    d[cat] = [...d[cat], gameItem];
    this.monthData.set(d); // L'interface se met à jour visuellement à l'écran en quelques millisecondes
    
    // Étape D : Envoi asynchrone du nouveau bloc JSON complet vers Supabase (méthode upsert)
    await this.backlogService.updateMonthData(this.monthKey(), d);
    
    // Étape E : Nettoyage et fermeture du menu de saisie de la colonne
    this.columnInputs[cat].set('');
    this.columnResults[cat].set([]);
  }

  /**
   * ACTION : SUPPRESSION D'UN JEU DANS UNE COLONNE
   * @param cat La catégorie visée
   * @param i L'index numérique de la carte dans le tableau (fourni par le index as i du *ngFor)
   */
  async removeItem(cat: CalendarCategory, i: number) { 
    const d = { ...this.monthData() }; 
    
    // Filtrage Javascript : On conserve tous les jeux de la liste SAUF celui dont l'index correspond à la ligne supprimée
    d[cat] = d[cat].filter((_: any, idx: number) => idx !== i); 
    
    // Notification du signal et sauvegarde cloud immédiate
    this.monthData.set(d);
    await this.backlogService.updateMonthData(this.monthKey(), d); 
  }

  /**
   * ALGORITHME DE ROCOMANDE DE NAVIGATION DES MOIS (PAGINATION TEMPORELLE)
   * Modifie l'état des signaux temporels en prenant en compte le basculement d'année (Janvier <-> Décembre).
   * @param delta Soit -1 (Mois précédent), soit 1 (Mois suivant)
   */
  changeMonth(delta: number) { 
    let nm = this.currentMonth() + delta; 
    let ny = this.currentYear(); 
    
    if (nm > 11) { // Si on dépasse Décembre, on bascule en Janvier de l'année suivante
      nm = 0; 
      ny++; 
    } else if (nm < 0) { // Si on recule avant Janvier, on bascule en Décembre de l'année précédente
      nm = 11; 
      ny--; 
    } 
    
    // La mise à jour de ces deux signaux va automatiquement réveiller l' "effect" déclaré dans le constructor
    this.currentMonth.set(nm); 
    this.currentYear.set(ny); 
  }
}