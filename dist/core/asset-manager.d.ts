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
    progress: number;
    currentAsset?: string;
}
export interface AssetLoadOptions {
    onProgress?: (progress: AssetLoadProgress) => void;
    timeout?: number;
    retryCount?: number;
}
export declare class AssetManager {
    private sprites;
    private fonts;
    private loadingPromises;
    private defaultSprite;
    private defaultFont;
    constructor();
    /**
     * Load all assets from a manifest
     */
    loadAssets(manifest: AssetManifest, options?: AssetLoadOptions): Promise<void>;
    /**
     * Load a single sprite asset
     */
    loadSpriteAsset(asset: SpriteAsset, timeout?: number, retryCount?: number): Promise<LoadedSpriteAsset>;
    /**
     * Load a single font asset
     */
    loadFontAsset(asset: FontAsset, timeout?: number, retryCount?: number): Promise<LoadedFontAsset>;
    /**
     * Get a loaded sprite asset
     */
    getSprite(id: string): LoadedSpriteAsset | null;
    /**
     * Get a loaded font asset
     */
    getFont(id: string): LoadedFontAsset | null;
    /**
     * Get sprite with fallback to default
     */
    getSpriteWithFallback(id: string): HTMLImageElement;
    /**
     * Get font family with fallback to default
     */
    getFontWithFallback(id: string): string;
    /**
     * Clear all cached assets
     */
    clearCache(): void;
    /**
     * Get memory usage statistics
     */
    getMemoryUsage(): {
        sprites: number;
        fonts: number;
        total: number;
    };
    /**
     * Check if an asset is loaded
     */
    isAssetLoaded(id: string, type: 'sprite' | 'font'): boolean;
    private loadSpriteWithRetry;
    private loadFontWithRetry;
    private loadSpriteImage;
    private loadFontFace;
    private createDefaultAssets;
    private createEmptyImage;
}
//# sourceMappingURL=asset-manager.d.ts.map