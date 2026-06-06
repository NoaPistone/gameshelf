export interface Game {
  id: string;
  title: string;
  developer?: string;
  publisher?: string;
  hltbMain?: number;
  hltbExtra?: number;
  hltbCompletionist?: number;
  status: 'À faire' | 'En cours' | 'En pause' | 'Abandonné' | 'Fini';
}

export interface GamePack {
  id: string;
  name: string;
  games: Game[];
}

export interface CalendarMonthData {
  monthKey: string; // Format 'YYYY-MM'
  gamesBought: string[];
  gamesStarted: string[];
  gamesFinished: string[];
  gamesPlayed100: string[];
}

export interface SteamNews {
  id: string;
  title: string;
  date: string;
  imageUrl: string;
  summary: string;
}