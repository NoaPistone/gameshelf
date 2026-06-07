import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BacklogService }from '../../core/services/backlog.service';
import { Game, GamePack } from '../../core/models/backlog.model';


@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.css']
})
export class LibraryComponent {
  public backlogService = inject(BacklogService);

  public globalLibrary = this.backlogService.globalLibrary;
  public packs = this.backlogService.packs;

  public newPackName = '';
  public isExcelLoading = signal<boolean>(false);
  public isOcrLoading = signal<boolean>(false);

  onCreatePack() {
    if (this.newPackName.trim()) {
      this.backlogService.addPack(this.newPackName.trim());
      this.newPackName = '';
    }
  }

  onStatusChange(packId: string, gameId: string | number, event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    this.backlogService.updateGameStatusInPack(packId, gameId, selectElement.value);
  }

  async onExcelFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.isExcelLoading.set(true);
      try {
        const partialGames = await this.backlogService.importExcelData(input.files[0]);
        
        // CORRECTION DE TYPAGE : Définition claire des types pour 'pg' (jeu partiel) et 'i' (index)
        const enriched: Game[] = partialGames.map((pg: any, i: number) => ({
          id: pg.id || `xl_${Date.now()}_${i}`,
          name: pg.name || 'Jeu Inconnu',
          background_image: 'assets/images/excel-placeholder.jpg',
          status: 'À faire'
        }));

        this.backlogService.updateGlobalLibrary([...this.globalLibrary(), ...enriched]);
      } catch (error) {
        console.error("Erreur durant l'import Excel :", error);
      } finally {
        this.isExcelLoading.set(false);
      }
    }
  }

  async onOcrFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.isOcrLoading.set(true);
      try {
        const titles = await this.backlogService.simulateOCRFromImage(input.files[0]);
        
        
        const ocrGames: Game[] = titles.map((t: any, i: number) => ({
          id: `ocr_${Date.now()}_${i}`,
          name: t,
          background_image: 'assets/images/ocr-placeholder.jpg',
          status: 'À faire'
        }));

        this.backlogService.updateGlobalLibrary([...this.globalLibrary(), ...ocrGames]);
      } catch (error) {
        console.error("Erreur durant l'analyse de l'image :", error);
      } finally {
        this.isOcrLoading.set(false);
      }
    }
  }

  async onPackImageSelected(packId: string, event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      try {
        await this.backlogService.importImageToPack(packId, input.files[0]);
      } catch (error) {
        console.error("Erreur d'import d'image dans le pack :", error);
      }
    }
  }
}