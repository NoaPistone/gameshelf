export interface Game {
  id: string;
  title: string;
  developer?: string;
  publisher?: string;      /* Ajouté pour la bibliothèque */
  status: 'À faire' | 'En cours' | 'Fini' | 'Platiné';
  hltbMain?: number;       /* Ajouté pour le temps de jeu */
  hltbExtra?: number;      /* Ajouté pour le temps de jeu */
  hltbCompletionist?: number; /* Ajouté pour le temps de jeu */
}

export interface GamePack {
  id: string;
  name: string;
  games: Game[];
}

export interface CalendarMonthData {
  monthKey: string;
  gamesBought: string[];
  gamesStarted: string[];
  gamesFinished: string[];
  gamesPlayed100: string[];
}