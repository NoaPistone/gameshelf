import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

/**
 * CONFIGURATION DE L'API SUPABASE
 * -------------------------------------------------------------------------------------
 * SUPABASE_URL : L'adresse unique de ton projet hébergé sur Supabase.
 * SUPABASE_KEY : La clé publique d'accès (Anon Key). Elle permet au client d'interagir
 * avec l'authentification et l'API de manière sécurisée.
 */
const SUPABASE_URL = 'https://ltkmkaridmxmmyuicgmi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0a21rYXJpZG14bW15dWljZ21pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MTcyOTQsImV4cCI6MjA5NjM5MzI5NH0.pY-14aM__yZkGdH07uuYNw6YJVYdi0mCU4bsPLAUCPA';

@Injectable({
  providedIn: 'root' // Indique à Angular que ce service est un Singleton unique disponible dans tout le projet
})
export class AuthService {
  // Instance privée du client Supabase pour centraliser les appels réseaux liés à la sécurité
  private supabase: SupabaseClient;

  /**
   * SIGNAL RÉACTIF DU COMPTE UTILISATEUR
   * -------------------------------------------------------------------------------------
   * currentUser : Stocke le profil complet fourni par Google (ID, e-mail, nom, avatar).
   * Sa valeur initiale est 'null' (indique que l'utilisateur navigue en mode "Invité").
   * Dès qu'il change, tous les composants Angular qui l'écoutent se mettent à jour automatiquement.
   */
  public currentUser = signal<User | null>(null);

  constructor() {
    // 1. Initialisation de la connexion avec le SDK Supabase
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    /**
     * 2. ÉCOUTEUR DE SESSION EN TEMPS RÉEL (onAuthStateChange)
     * Se déclenche automatiquement à chaque fois qu'un événement lié à la session survient :
     * - Connexion réussie
     * - Déconnexion
     * - Rafraîchissement automatique de la page (F5) : il récupère la session restée en cache
     */
    this.supabase.auth.onAuthStateChange((event, session) => {
      // Met à jour le signal avec l'objet 'user' s'il existe, sinon repasse à 'null'
      this.currentUser.set(session?.user ?? null);
    });
  }

  /**
   * ACTION : CONNEXION VIA GOOGLE (OAuth2)
   * -------------------------------------------------------------------------------------
   * Redirige l'utilisateur vers la page officielle de sélection de compte Google.
   */
  async loginWithGoogle() {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Indique à Google où renvoyer l'utilisateur une fois qu'il a validé son identité
        redirectTo: window.location.origin 
      }
    });

    // Capture et affiche l'erreur dans la console si le protocole Google/Supabase échoue
    if (error) {
      console.error("Erreur d'authentification :", error.message);
    }
  }

  /**
   * ACTION : DÉCONNEXION DE L'UTILISATEUR
   * -------------------------------------------------------------------------------------
   * Détruit la session sur Supabase et nettoie les jetons d'accès (cookies) du navigateur.
   */
  async logout() {
    const { error } = await this.supabase.auth.signOut();
    
    // Capture et affiche l'erreur en console s'il y a un problème de déconnexion
    if (error) {
      console.error("Erreur lors de la déconnexion :", error.message);
    }
  }
}