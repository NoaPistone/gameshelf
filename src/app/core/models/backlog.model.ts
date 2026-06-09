//objet central de mon application. Il représente un jeu vidéo, 
// qu'il vienne de l'API externe RAWG, de ton LocalStorage, de ton fichier d'import Excel, ou de Supabase
export interface Game {
  id: string | number;               // L'identifiant unique. 'number' pour l'API RAWG (ex: 3498), 'string' pour tes imports Excel/OCR (ex: 'xl_172000...')
  name: string;                      // Le nom officiel du jeu. Affiché partout dans tes listes et ton calendrier.
  title?: string;                    // Le point d'interrogation (?) signifie "optionnel". Utile si d'anciennes données utilisaient "title" au lieu de "name".
  background_image?: string;         // L'URL de l'image renvoyée par RAWG (utilisée pour l'affichage des cartes de jeux).
  image?: string;                    // Alternative optionnelle pour stocker l'image locale ou simplifiée (utilisée dans ton calendrier).
  developer?: string;                // Le studio qui a créé le jeu (ex: "Square Enix"). Optionnel, utile pour la page détails.
  publisher?: string;                // L'éditeur qui a sorti le jeu (ex: "Nintendo"). Optionnel.
  status?: 'À faire' | 'En cours' | 'Fini' | 'Platiné' | string; // Le statut de progression. Restreint à tes 4 choix mais accepte n'importe quelle chaîne pour éviter les crashs d'import.
  steamPrice?: SteamPriceData | null; // Contient un sous-objet complet avec les prix Steam (détails plus bas).
  hltbMain?: number;                 // Temps en heures pour finir l'histoire principale (HowLongToBeat).
  hltbExtra?: number;                // Temps en heures pour l'histoire + les quêtes annexes.
  hltbCompletionist?: number;        // Temps en heures pour le 100% (le Platine).
}


//Sert à regrouper des jeux dans des listes personnalisées, 
// des compilations ou des franchises (par exemple : un Pack "Mana Saga", un Pack "Soulsborne"
export interface GamePack {
  id: string;      // Identifiant unique du pack (généré souvent via 'pack_' + Date.now())
  name: string;    // Le nom du pack (ex: "Jeux à faire cet été")
  games: Game[];   // Un tableau d'objets `Game`. C'est l'imbrication de la première interface !
}


//définit exactement la structure attendue pour stocker le backlog d'un mois précis dans ton calendrier
export interface CalendarMonthData {
  monthKey: string;         // Clé au format 'YYYY-MM' (ex: '2026-06') qui sert d'identifiant unique pour le mois.
  gamesBought: string[];    // Liste des noms ou des objets de jeux achetés ce mois-ci.
  gamesStarted: string[];   // Liste des jeux commencés ce mois-ci.
  gamesFinished: string[];  // Liste des jeux terminés ce mois-ci.
  gamesPlayed100: string[]; // Liste des jeux complétés à 100% (Platinés).
}

//Structure des données générée par ton serveur Proxy (localhost:3000)
//lorsqu'il interroge l'API de Valve (Steam) pour récupérer les tarifs en temps réel d'un jeu
export interface SteamPriceData {
  isFree: boolean;          // true si le jeu est gratuit (Free-to-play)
  success: boolean;         // true si Steam a trouvé le jeu et répondu correctement
  currency: string;         // La devise (ex: "EUR", "USD")
  initialPrice: string;     // Le prix d'origine avant la promotion (ex: "59,99€")
  finalPrice: string;       // Le prix actuel à payer (ex: "14,99€")
  discountPercent: number;  // Le pourcentage de réduction (ex: 75)
  isDiscounted: boolean;    // true si le jeu est actuellement en solde
  message?: string;         // Optionnel : Un message en cas d'erreur de recherche
}