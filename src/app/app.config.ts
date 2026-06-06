import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core'; // <-- Changement ici
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(), // <-- Et ici
    provideRouter(routes)
  ]
};