/**
 * Asset Management System
 * Handles loading, caching, and management of sprites, audio, and fonts
 */

import { SpriteAsset, FontAsset, AssetManifest } from '../types/core.js';

export interface LoadedSpriteAsset {
  id: string;
  image: HTMLImageElement;
  width: number;
  height: number;
  frames: number;
}

export interface LoadedFontAsset {
  id: string;
  family: string;
  loaded: boolean;
}

export interface AssetLoadProgress {
  total: number;
  loaded: number;
  failed: number;
  progress: number; // 0-1
  currentAsset?: string;
}

export interface AssetLoadOptions {
  onProgress?: (progress: AssetLoadProgress) => void;
  timeout?: number; // milliseconds
  retryCount?: number;
}

export class AssetManager {
  private sprites: Map<string, LoadedSpriteAsset> = new Map();
  private fonts: Map<string, LoadedFontAsset> = new Map();
  private loadingPromises: Map<string, Promise<any>> = new Map();
  
  // Default/fallback assets
  private defaultSprite: HTMLImageElement | null = null;
  private defaultFont: string = 'Arial, sans-serif';

  constructor() {
    this.createDefaultAssets();
  }

  /**
   * Load all assets from a manifest
   */
  async loadAssets(manifest: AssetManifest, options: AssetLoadOptions = {}): Promise<void> {
    const { onProgress, timeout = 10000, retryCount = 2 } = options;
    
    const allAssets = [
      ...manifest.sprites.map(asset => ({ ...asset, type: 'sprite' as const })),
      ...manifest.fonts.map(asset => ({ ...asset, type: 'font' as const }))
    ];

    const progress: AssetLoadProgress = {
      total: allAssets.length,
      loaded: 0,
      failed: 0,
      progress: 0
    };

    if (onProgress) {
      onProgress(progress);
    }

    const loadPromises = allAssets.map(async (asset) => {
      try {
        progress.currentAsset = asset.id;
        
        if (asset.type === 'sprite') {
          await this.loadSpriteAsset(asset as SpriteAsset, timeout, retryCount);
        } else if (asset.type === 'font') {
          await this.loadFontAsset(asset as FontAsset, timeout, retryCount);
        }
        
        progress.loaded++;
      } catch (error) {
        console.warn(`Failed to load asset '${asset.id}':`, error);
        progress.failed++;
      }
      
      progress.progress = (progress.loaded + progress.failed) / progress.total;
      if (onProgress) {
        onProgress(progress);
      }
    });

    await Promise.allSettled(loadPromises);
  }

  /**
   * Load a single sprite asset
   */
  async loadSpriteAsset(asset: SpriteAsset, timeout: number = 10000, retryCount: number = 2): Promise<LoadedSpriteAsset> {
    // Check if already loaded
    const existing = this.sprites.get(asset.id);
    if (existing) {
      return existing;
    }

    // Check if already loading
    const existingPromise = this.loadingPromises.get(`sprite:${asset.id}`);
    if (existingPromise) {
      return existingPromise;
    }

    const loadPromise = this.loadSpriteWithRetry(asset, timeout, retryCount);
    this.loadingPromises.set(`sprite:${asset.id}`, loadPromise);

    try {
      const loadedAsset = await loadPromise;
      this.sprites.set(asset.id, loadedAsset);
      return loadedAsset;
    } finally {
      this.loadingPromises.delete(`sprite:${asset.id}`);
    }
  }

  /**
   * Load a single font asset
   */
  async loadFontAsset(asset: FontAsset, timeout: number = 10000, retryCount: number = 2): Promise<LoadedFontAsset> {
    // Check if already loaded
    const existing = this.fonts.get(asset.id);
    if (existing) {
      return existing;
    }

    // Check if already loading
    const existingPromise = this.loadingPromises.get(`font:${asset.id}`);
    if (existingPromise) {
      return existingPromise;
    }

    const loadPromise = this.loadFontWithRetry(asset, timeout, retryCount);
    this.loadingPromises.set(`font:${asset.id}`, loadPromise);

    try {
      const loadedAsset = await loadPromise;
      this.fonts.set(asset.id, loadedAsset);
      return loadedAsset;
    } finally {
      this.loadingPromises.delete(`font:${asset.id}`);
    }
  }

  /**
   * Get a loaded sprite asset
   */
  getSprite(id: string): LoadedSpriteAsset | null {
    return this.sprites.get(id) || null;
  }

  /**
   * Get a loaded font asset
   */
  getFont(id: string): LoadedFontAsset | null {
    return this.fonts.get(id) || null;
  }

  /**
   * Get sprite with fallback to default
   */
  getSpriteWithFallback(id: string): HTMLImageElement {
    const sprite = this.sprites.get(id);
    if (sprite) {
      return sprite.image;
    }
    
    console.warn(`Sprite '${id}' not found, using fallback`);
    return this.defaultSprite || this.createEmptyImage();
  }

  /**
   * Get font family with fallback to default
   */
  getFontWithFallback(id: string): string {
    const font = this.fonts.get(id);
    if (font && font.loaded) {
      return font.family;
    }
    
    console.warn(`Font '${id}' not found or not loaded, using fallback`);
    return this.defaultFont;
  }

  /**
   * Clear all cached assets
   */
  clearCache(): void {
    this.sprites.clear();
    this.fonts.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get memory usage statistics
   */
  getMemoryUsage(): { sprites: number; fonts: number; total: number } {
    let spriteMemory = 0;
    for (const sprite of this.sprites.values()) {
      // Estimate memory usage: width * height * 4 bytes per pixel
      spriteMemory += sprite.width * sprite.height * 4;
    }

    const fontMemory = this.fonts.size * 1024; // Rough estimate per font
    
    return {
      sprites: spriteMemory,
      fonts: fontMemory,
      total: spriteMemory + fontMemory
    };
  }

  /**
   * Check if an asset is loaded
   */
  isAssetLoaded(id: string, type: 'sprite' | 'font'): boolean {
    if (type === 'sprite') {
      return this.sprites.has(id);
    } else if (type === 'font') {
      const font = this.fonts.get(id);
      return font ? font.loaded : false;
    }
    return false;
  }

  private async loadSpriteWithRetry(asset: SpriteAsset, timeout: number, retryCount: number): Promise<LoadedSpriteAsset> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        return await this.loadSpriteImage(asset, timeout);
      } catch (error) {
        lastError = error as Error;
        if (attempt < retryCount) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw lastError;
  }

  private async loadFontWithRetry(asset: FontAsset, timeout: number, retryCount: number): Promise<LoadedFontAsset> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        return await this.loadFontFace(asset, timeout);
      } catch (error) {
        lastError = error as Error;
        if (attempt < retryCount) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw lastError;
  }

  private async loadSpriteImage(asset: SpriteAsset, timeout: number): Promise<LoadedSpriteAsset> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        img.onload = null;
        img.onerror = null;
      };

      img.onload = () => {
        cleanup();
        resolve({
          id: asset.id,
          image: img,
          width: asset.width,
          height: asset.height,
          frames: asset.frames || 1
        });
      };

      img.onerror = () => {
        cleanup();
        reject(new Error(`Failed to load sprite: ${asset.url}`));
      };

      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Sprite load timeout: ${asset.url}`));
      }, timeout);

      // Set crossOrigin to handle CORS if needed
      img.crossOrigin = 'anonymous';
      img.src = asset.url;
    });
  }

  private async loadFontFace(asset: FontAsset, timeout: number): Promise<LoadedFontAsset> {
    // Check if FontFace API is available
    if (typeof FontFace === 'undefined') {
      // Fallback for older browsers - just return the font family
      return {
        id: asset.id,
        family: asset.family,
        loaded: true
      };
    }

    return new Promise((resolve, reject) => {
      const fontFace = new FontFace(asset.family, `url(${asset.url})`);
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };

      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Font load timeout: ${asset.url}`));
      }, timeout);

      fontFace.load().then(() => {
        cleanup();
        // Add font to document
        (document as any).fonts.add(fontFace);
        
        resolve({
          id: asset.id,
          family: asset.family,
          loaded: true
        });
      }).catch((error) => {
        cleanup();
        reject(new Error(`Failed to load font: ${asset.url} - ${error.message}`));
      });
    });
  }

  private createDefaultAssets(): void {
    // Create a simple 1x1 transparent pixel as default sprite
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(255, 0, 255, 0.5)'; // Magenta to indicate missing asset
        ctx.fillRect(0, 0, 1, 1);
      }
      
      this.defaultSprite = new Image();
      this.defaultSprite.src = canvas.toDataURL();
    } catch (error) {
      // Fallback for test environments without canvas support
      this.defaultSprite = new Image();
      this.defaultSprite.width = 1;
      this.defaultSprite.height = 1;
    }
  }

  private createEmptyImage(): HTMLImageElement {
    const img = new Image();
    img.width = 1;
    img.height = 1;
    return img;
  }
}