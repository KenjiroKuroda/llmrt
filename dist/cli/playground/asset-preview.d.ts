/**
 * Asset Preview and Debugging Tools
 * Provides visual preview and analysis of game assets
 */
import type { LGFCartridge } from '../types/index.js';
export interface AssetInfo {
    id: string;
    type: 'sprite' | 'audio' | 'font';
    url: string;
    loaded: boolean;
    error?: string;
    size?: number;
    dimensions?: {
        width: number;
        height: number;
    };
    duration?: number;
    format?: string;
    loadTime?: number;
}
export interface AssetUsage {
    assetId: string;
    usedBy: string[];
    usageCount: number;
}
export declare class AssetPreviewManager {
    private assets;
    private loadedImages;
    private loadedAudio;
    private loadedFonts;
    private assetUsage;
    constructor();
    private setupFontLoadingDetection;
    loadCartridgeAssets(cartridge: LGFCartridge): Promise<void>;
    private loadSprite;
    private loadAudio;
    private loadFont;
    private analyzeAssetUsage;
    private analyzeNodeAssetUsage;
    private detectImageFormat;
    private detectAudioFormat;
    private detectFontFormat;
    private estimateImageSize;
    private estimateAudioSize;
    getAssetInfo(id: string): AssetInfo | undefined;
    getAllAssets(): AssetInfo[];
    getLoadedAssets(): AssetInfo[];
    getFailedAssets(): AssetInfo[];
    getAssetsByType(type: 'sprite' | 'audio' | 'font'): AssetInfo[];
    getAssetUsage(id: string): AssetUsage | undefined;
    getUnusedAssets(): AssetInfo[];
    getTotalSize(): number;
    getLoadingStats(): {
        total: number;
        loaded: number;
        failed: number;
        pending: number;
        averageLoadTime: number;
    };
    createPreviewElement(assetId: string): HTMLElement | null;
    private playAudio;
    exportAssetReport(): string;
    clearAssets(): void;
}
//# sourceMappingURL=asset-preview.d.ts.map