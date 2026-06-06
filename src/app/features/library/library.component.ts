import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BacklogService } from '../../core/services/backlog.service';
import { Game } from '../../core/models/backlog.model';

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
  public isImageDragging = false;
  public isExcelDragging = false;
  public activePackDragId: string | null = null;
  public isOcrLoading = signal<Record<string, boolean>>({});

  // --- ACTIONS PACK DYNAMIQUE ---
  createPack() {
    if (!this.newPackName.trim()) return;
    this.backlogService.addPack(this.newPackName.trim());
    this.newPackName = '';
  }

  updateStatus(packId: string, gameId: string, event: Event) {
    const select = event.target as HTMLSelectElement;
    this.backlogService.updateGameStatusInPack(packId, gameId, select.value as Game['status']);
  }

  // --- GESTION DRAG & DROP BIBLIOTHÈQUE ---
  onDragOver(event: DragEvent, type: 'image' | 'excel') {
    event.preventDefault();
    if (type === 'image') this.isImageDragging = true;
    if (type === 'excel') this.isExcelDragging = true;
  }

  onDragLeave(type: 'image' | 'excel') {
    if (type === 'image') this.isImageDragging = false;
    if (type === 'excel') this.isExcelDragging = false;
  }

  async onDropGlobal(event: DragEvent, type: 'image' | 'excel') {
    event.preventDefault();
    this.onDragLeave(type);
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    if (type === 'excel') {
      const partialGames = await this.backlogService.importExcelData(files[0]);
      // On enrichit la bibliothèque de base avec les données Excel croisées
      const enriched: Game[] = partialGames.map((pg, i) => ({
        id: `xls_${Date.now()}_${i}`,
        title: pg.title || 'Jeu inconnu',
        developer: pg.developer || 'N/A',
        publisher: pg.publisher || 'N/A',
        hltbMain: pg.hltbMain,
        hltbExtra: pg.hltbExtra,
        hltbCompletionist: pg.hltbCompletionist,
        status: 'À faire'
      }));
      this.globalLibrary.set([...this.globalLibrary(), ...enriched]);
    } else if (type === 'image') {
      // Simulation OCR globale
      const titles = await this.backlogService.simulateOCRFromImage(files[0]);
      const ocrGames: Game[] = titles.map((t, i) => ({
        id: `global_ocr_${Date.now()}_${i}`,
        title: t,
        status: 'À faire'
      }));
      this.globalLibrary.set([...this.globalLibrary(), ...ocrGames]);
    }
  }

  // --- GESTION DRAG & DROP PACK SPECIFIQUE ---
  onPackDragOver(event: DragEvent, packId: string) {
    event.preventDefault();
    this.activePackDragId = packId;
  }

  onPackDragLeave() {
    this.activePackDragId = null;
  }

  async onPackDrop(event: DragEvent, packId: string) {
    event.preventDefault();
    this.activePackDragId = null;
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    // Déclenchement de l'état de chargement IA pour ce pack
    this.isOcrLoading.update(prev => ({ ...prev, [packId]: true }));
    
    await this.backlogService.importImageToPack(packId, files[0]);
    
    this.isOcrLoading.update(prev => ({ ...prev, [packId]: false }));
  }
}