import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// Constantes globales propres au fichier pour éviter les erreurs d'imports d'environnement
const SUPABASE_URL = 'https://ltkmkaridmxmmyuicgmi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0a21rYXJpZG14bW15dWljZ21pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MTcyOTQsImV4cCI6MjA5NjM5MzI5NH0.pY-14aM__yZkGdH07uuYNw6YJVYdi0mCU4bsPLAUCPA';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase: SupabaseClient;
  public currentUser = signal<User | null>(null);

  constructor() {
    // Initialisation directe sans passer par l'objet environment instable
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    this.supabase.auth.onAuthStateChange((event, session) => {
      this.currentUser.set(session?.user ?? null);
    });
  }

  async loginWithGoogle() {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) {
      console.error("Erreur d'authentification :", error.message);
    }
  }

  async logout() {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      console.error("Erreur lors de la déconnexion :", error.message);
    }
  }
}