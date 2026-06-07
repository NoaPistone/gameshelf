export interface Game {
  id: string | number;
  name: string;               // Utilisé par ton HTML et RAWG
  title?: string;             // Conservé pour la compatibilité avec tes anciens packs
  background_image?: string;  //
  image?: string;
  developer?: string;         //
  publisher?: string;         //
  status?: 'À faire' | 'En cours' | 'Fini' | 'Platiné' | string; // Type élargi pour accepter 'string' sans erreur
  steamPrice?: SteamPriceData | null; //
  hltbMain?: number;          //
  hltbExtra?: number;         //
  hltbCompletionist?: number; //
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

export interface SteamPriceData {
  isFree: boolean;
  success: boolean;
  currency: string;
  initialPrice: string;
  finalPrice: string;
  discountPercent: number;
  isDiscounted: boolean;
  message?: string;
}