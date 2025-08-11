/**
 * Asset Preview and Debugging Tools
 * Provides visual preview and analysis of game assets
 */

import type { LGFCartridge, SpriteAsset, AudioAsset, FontAsset } from '../types/index.js';

export interface AssetInfo {
  id: string;
  type: 'sprite' | 'audio' | 'font';
  url: string;
  loaded: boolean;
  error?: string;
  size?: number;
  dimensions?: { width: number; height: number };
  duration?: number; // for audio
  format?: string;
  loadTime?: number;
}

export interface AssetUsage {
  assetId: string;
  usedBy: string[]; // node IDs that use this asset
  usageCount: number;
}

export class AssetPreviewManager {
  private assets: Map<string, AssetInfo> = new Map();
  private loadedImages: Map<string, HTMLImageElement> = new Map();
  private loadedAudio: Map<string, HTMLAudioElement> = new Map();
  private loadedFonts: Map<string, FontFace> = new Map();
  private assetUsage: Map<string, AssetUsage> = new Map();

  constructor() {
    this.setupFontLoadingDetection();
  }

  private setupFontLoadingDetection(): void {
    if ('fonts' in document) {
      document.fonts.addEventListener('loadingdone', (event) => {
        console.log('Font loading completed:', event);
      });
    }
  }

  async loadCartridgeAssets(cartridge: LGFCartridge): Promise<void> {
    this.clearAssets();
    
    // Analyze asset usage
    this.analyzeAssetUsage(cartridge);

    // Load sprites
    const spritePromises = cartridge.assets.sprites.map(sprite => 
      this.loadSprite(sprite)
    );

    // Load audio
    const audioPromises = cartridge.assets.audio.map(audio => 
      this.loadAudio(audio)
    );

    // Load fonts
    const fontPromises = cartridge.assets.fonts.map(font => 
      this.loadFont(font)
    );

    // Wait for all assets to load
    await Promise.allSettled([
      ...spritePromises,
      ...audioPromises,
      ...fontPromises
    ]);

    console.log(`Loaded ${this.assets.size} assets`);
  }

  private async loadSprite(sprite: SpriteAsset): Promise<void> {
    const startTime = performance.now();
    
    const assetInfo: AssetInfo = {
      id: sprite.id,
      type: 'sprite',
      url: sprite.url,
      loaded: false,
      dimensions: { width: sprite.width, height: sprite.height },
      format: this.detectImageFormat(sprite.url)
    };

    this.assets.set(sprite.id, assetInfo);

    try {
      const img = new Image();
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          assetInfo.loaded = true;
          assetInfo.loadTime = performance.now() - startTime;
          assetInfo.size = this.estimateImageSize(img);
          this.loadedImages.set(sprite.id, img);
          resolve();
        };
        
        img.onerror = () => {
          assetInfo.error = 'Failed to load image';
          reject(new Error(`Failed to load sprite: ${sprite.id}`));
        };
        
        img.src = sprite.url;
      });

    } catch (error) {
      assetInfo.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to load sprite ${sprite.id}:`, error);
    }
  }

  private async loadAudio(audio: AudioAsset): Promise<void> {
    const startTime = performance.now();
    
    const assetInfo: AssetInfo = {
      id: audio.id,
      type: 'audio',
      url: audio.url,
      loaded: false,
      format: this.detectAudioFormat(audio.url)
    };

    this.assets.set(audio.id, assetInfo);

    try {
      const audioElement = new Audio();
      
      await new Promise<void>((resolve, reject) => {
        audioElement.addEventListener('canplaythrough', () => {
          assetInfo.loaded = true;
          assetInfo.loadTime = performance.now() - startTime;
          assetInfo.duration = audioElement.duration;
          assetInfo.size = this.estimateAudioSize(audioElement);
          this.loadedAudio.set(audio.id, audioElement);
          resolve();
        });
        
        audioElement.addEventListener('error', () => {
          assetInfo.error = 'Failed to load audio';
          reject(new Error(`Failed to load audio: ${audio.id}`));
        });
        
        audioElement.src = audio.url;
        audioElement.load();
      });

    } catch (error) {
      assetInfo.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to load audio ${audio.id}:`, error);
    }
  }

  private async loadFont(font: FontAsset): Promise<void> {
    const startTime = performance.now();
    
    const assetInfo: AssetInfo = {
      id: font.id,
      type: 'font',
      url: font.url,
      loaded: false,
      format: this.detectFontFormat(font.url)
    };

    this.assets.set(font.id, assetInfo);

    try {
      if ('FontFace' in window) {
        const fontFace = new FontFace(font.family, `url(${font.url})`);
        
        await fontFace.load();
        (document.fonts as any).add(fontFace);
        
        assetInfo.loaded = true;
        assetInfo.loadTime = performance.now() - startTime;
        this.loadedFonts.set(font.id, fontFace);
        
      } else {
        // Fallback for older browsers
        const style = document.createElement('style');
        style.textContent = `
          @font-face {
            font-family: '${font.family}';
            src: url('${font.url}');
          }
        `;
        document.head.appendChild(style);
        
        assetInfo.loaded = true;
        assetInfo.loadTime = performance.now() - startTime;
      }

    } catch (error) {
      assetInfo.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to load font ${font.id}:`, error);
    }
  }

  private analyzeAssetUsage(cartridge: LGFCartridge): void {
    this.assetUsage.clear();

    // Initialize usage tracking for all assets
    [...cartridge.assets.sprites, ...cartridge.assets.audio, ...cartridge.assets.fonts]
      .forEach(asset => {
        this.assetUsage.set(asset.id, {
          assetId: asset.id,
          usedBy: [],
          usageCount: 0
        });
      });

    // Analyze scene nodes for asset usage
    cartridge.scenes.forEach(scene => {
      this.analyzeNodeAssetUsage(scene.root);
    });
  }

  private analyzeNodeAssetUsage(node: any): void {
    // Check sprite usage
    if (node.sprite && this.assetUsage.has(node.sprite)) {
      const usage = this.assetUsage.get(node.sprite)!;
      usage.usedBy.push(node.id);
      usage.usageCount++;
    }

    // Check audio usage in actions
    if (node.actions) {
      node.actions.forEach((action: any) => {
        if ((action.type === 'playSfx' || action.type === 'playMusic') && action.params.id) {
          const usage = this.assetUsage.get(action.params.id);
          if (usage) {
            usage.usedBy.push(node.id);
            usage.usageCount++;
          }
        }
      });
    }

    // Check triggers for audio usage
    if (node.triggers) {
      node.triggers.forEach((trigger: any) => {
        trigger.actions?.forEach((action: any) => {
          if ((action.type === 'playSfx' || action.type === 'playMusic') && action.params.id) {
            const usage = this.assetUsage.get(action.params.id);
            if (usage) {
              usage.usedBy.push(node.id);
              usage.usageCount++;
            }
          }
        });
      });
    }

    // Recursively check children
    if (node.children) {
      node.children.forEach((child: any) => this.analyzeNodeAssetUsage(child));
    }
  }

  private detectImageFormat(url: string): string {
    if (url.startsWith('data:image/')) {
      const match = url.match(/data:image\/([^;]+)/);
      return match ? match[1].toUpperCase() : 'Unknown';
    }
    
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'png': return 'PNG';
      case 'jpg':
      case 'jpeg': return 'JPEG';
      case 'gif': return 'GIF';
      case 'webp': return 'WebP';
      case 'svg': return 'SVG';
      default: return 'Unknown';
    }
  }

  private detectAudioFormat(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'mp3': return 'MP3';
      case 'wav': return 'WAV';
      case 'ogg': return 'OGG';
      case 'aac': return 'AAC';
      case 'm4a': return 'M4A';
      default: return 'Unknown';
    }
  }

  private detectFontFormat(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'woff': return 'WOFF';
      case 'woff2': return 'WOFF2';
      case 'ttf': return 'TTF';
      case 'otf': return 'OTF';
      case 'eot': return 'EOT';
      default: return 'Unknown';
    }
  }

  private estimateImageSize(img: HTMLImageElement): number {
    // Rough estimation based on dimensions and assumed bit depth
    return img.width * img.height * 4; // 4 bytes per pixel (RGBA)
  }

  private estimateAudioSize(audio: HTMLAudioElement): number {
    // Very rough estimation - would need actual file size for accuracy
    if (audio.duration) {
      return audio.duration * 44100 * 2 * 2; // 44.1kHz, stereo, 16-bit
    }
    return 0;
  }

  getAssetInfo(id: string): AssetInfo | undefined {
    return this.assets.get(id);
  }

  getAllAssets(): AssetInfo[] {
    return Array.from(this.assets.values());
  }

  getLoadedAssets(): AssetInfo[] {
    return Array.from(this.assets.values()).filter(asset => asset.loaded);
  }

  getFailedAssets(): AssetInfo[] {
    return Array.from(this.assets.values()).filter(asset => asset.error);
  }

  getAssetsByType(type: 'sprite' | 'audio' | 'font'): AssetInfo[] {
    return Array.from(this.assets.values()).filter(asset => asset.type === type);
  }

  getAssetUsage(id: string): AssetUsage | undefined {
    return this.assetUsage.get(id);
  }

  getUnusedAssets(): AssetInfo[] {
    return Array.from(this.assets.values()).filter(asset => {
      const usage = this.assetUsage.get(asset.id);
      return !usage || usage.usageCount === 0;
    });
  }

  getTotalSize(): number {
    return Array.from(this.assets.values())
      .reduce((total, asset) => total + (asset.size || 0), 0);
  }

  getLoadingStats(): {
    total: number;
    loaded: number;
    failed: number;
    pending: number;
    averageLoadTime: number;
  } {
    const assets = Array.from(this.assets.values());
    const loaded = assets.filter(a => a.loaded);
    const failed = assets.filter(a => a.error);
    const pending = assets.filter(a => !a.loaded && !a.error);
    
    const totalLoadTime = loaded.reduce((sum, asset) => sum + (asset.loadTime || 0), 0);
    const averageLoadTime = loaded.length > 0 ? totalLoadTime / loaded.length : 0;

    return {
      total: assets.length,
      loaded: loaded.length,
      failed: failed.length,
      pending: pending.length,
      averageLoadTime
    };
  }

  createPreviewElement(assetId: string): HTMLElement | null {
    const asset = this.assets.get(assetId);
    if (!asset || !asset.loaded) return null;

    const container = document.createElement('div');
    container.className = 'asset-preview-item';
    container.style.cssText = `
      border: 1px solid #3e3e42;
      border-radius: 4px;
      padding: 8px;
      margin: 4px;
      background: #252526;
      display: inline-block;
      text-align: center;
      min-width: 100px;
    `;

    const header = document.createElement('div');
    header.style.cssText = 'font-size: 11px; margin-bottom: 4px; color: #d4d4d4;';
    header.textContent = `${asset.id} (${asset.type})`;
    container.appendChild(header);

    if (asset.type === 'sprite') {
      const img = this.loadedImages.get(assetId);
      if (img) {
        const preview = img.cloneNode() as HTMLImageElement;
        preview.style.cssText = `
          max-width: 80px;
          max-height: 80px;
          image-rendering: pixelated;
          border: 1px solid #555;
        `;
        container.appendChild(preview);

        const info = document.createElement('div');
        info.style.cssText = 'font-size: 10px; color: #888; margin-top: 4px;';
        info.textContent = `${asset.dimensions?.width}×${asset.dimensions?.height} ${asset.format}`;
        container.appendChild(info);
      }
    } else if (asset.type === 'audio') {
      const icon = document.createElement('div');
      icon.style.cssText = 'font-size: 32px; margin: 8px 0;';
      icon.textContent = '🔊';
      container.appendChild(icon);

      const info = document.createElement('div');
      info.style.cssText = 'font-size: 10px; color: #888;';
      info.textContent = `${asset.duration?.toFixed(1)}s ${asset.format}`;
      container.appendChild(info);

      // Add play button
      const playBtn = document.createElement('button');
      playBtn.textContent = '▶';
      playBtn.style.cssText = `
        background: #0e639c;
        color: white;
        border: none;
        padding: 2px 6px;
        border-radius: 2px;
        cursor: pointer;
        font-size: 10px;
        margin-top: 4px;
      `;
      playBtn.onclick = () => this.playAudio(assetId);
      container.appendChild(playBtn);
    } else if (asset.type === 'font') {
      const sample = document.createElement('div');
      sample.style.cssText = `
        font-family: '${this.loadedFonts.get(assetId)?.family || 'monospace'}';
        font-size: 16px;
        margin: 8px 0;
        color: #d4d4d4;
      `;
      sample.textContent = 'Abc 123';
      container.appendChild(sample);

      const info = document.createElement('div');
      info.style.cssText = 'font-size: 10px; color: #888;';
      info.textContent = asset.format || 'Unknown';
      container.appendChild(info);
    }

    // Add usage info
    const usage = this.assetUsage.get(assetId);
    if (usage) {
      const usageInfo = document.createElement('div');
      usageInfo.style.cssText = 'font-size: 9px; color: #666; margin-top: 4px;';
      usageInfo.textContent = `Used ${usage.usageCount} times`;
      container.appendChild(usageInfo);
    }

    return container;
  }

  private playAudio(assetId: string): void {
    const audio = this.loadedAudio.get(assetId);
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(error => {
        console.warn('Failed to play audio:', error);
      });
    }
  }

  exportAssetReport(): string {
    const stats = this.getLoadingStats();
    const unusedAssets = this.getUnusedAssets();
    const failedAssets = this.getFailedAssets();

    const report = {
      summary: {
        totalAssets: stats.total,
        loadedAssets: stats.loaded,
        failedAssets: stats.failed,
        pendingAssets: stats.pending,
        averageLoadTime: stats.averageLoadTime,
        totalSize: this.getTotalSize()
      },
      assetsByType: {
        sprites: this.getAssetsByType('sprite').length,
        audio: this.getAssetsByType('audio').length,
        fonts: this.getAssetsByType('font').length
      },
      issues: {
        unusedAssets: unusedAssets.map(a => ({ id: a.id, type: a.type })),
        failedAssets: failedAssets.map(a => ({ id: a.id, type: a.type, error: a.error }))
      },
      assets: Array.from(this.assets.values()),
      usage: Array.from(this.assetUsage.values())
    };

    return JSON.stringify(report, null, 2);
  }

  clearAssets(): void {
    this.assets.clear();
    this.loadedImages.clear();
    this.loadedAudio.clear();
    this.loadedFonts.clear();
    this.assetUsage.clear();
  }
}