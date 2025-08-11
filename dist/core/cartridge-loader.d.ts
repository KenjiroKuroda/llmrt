/**
 * Cartridge Loading System
 * Handles loading, parsing, and validation of LGF cartridges
 */
import { LGFCartridge } from '../types/core.js';
import { ValidationResult } from './validator.js';
import { AssetManager, AssetLoadProgress } from './asset-manager.js';
import { AudioManager } from './audio-manager.js';
export interface CartridgeLoadProgress {
    stage: 'parsing' | 'validating' | 'loading-assets';
    progress: number;
    message: string;
    assetProgress?: AssetLoadProgress;
}
export interface CartridgeLoadOptions {
    onProgress?: (progress: CartridgeLoadProgress) => void;
    validateOnly?: boolean;
    skipAssets?: boolean;
    assetTimeout?: number;
    assetRetryCount?: number;
}
export interface LoadedCartridge {
    cartridge: LGFCartridge;
    validation: ValidationResult;
    assetManager: AssetManager;
    audioManager: AudioManager;
}
export declare class CartridgeLoader {
    private assetManager;
    private audioManager;
    constructor(assetManager?: AssetManager, audioManager?: AudioManager);
    /**
     * Load a cartridge from JSON string
     */
    loadFromJSON(jsonString: string, options?: CartridgeLoadOptions): Promise<LoadedCartridge>;
    /**
     * Load a cartridge from a URL
     */
    loadFromURL(url: string, options?: CartridgeLoadOptions): Promise<LoadedCartridge>;
    /**
     * Load a cartridge from a File object (for file uploads)
     */
    loadFromFile(file: File, options?: CartridgeLoadOptions): Promise<LoadedCartridge>;
    /**
     * Validate a cartridge without loading assets
     */
    validateCartridge(cartridge: string | object): Promise<ValidationResult>;
    /**
     * Get asset manager instance
     */
    getAssetManager(): AssetManager;
    /**
     * Get audio manager instance
     */
    getAudioManager(): AudioManager;
    /**
     * Clear all cached assets
     */
    clearCache(): void;
    /**
     * Get memory usage statistics
     */
    getMemoryUsage(): {
        assets: any;
        audio: number;
        total: number;
    };
    private loadCartridgeAssets;
}
/**
 * Convenience function to create a cartridge loader
 */
export declare function createCartridgeLoader(assetManager?: AssetManager, audioManager?: AudioManager): CartridgeLoader;
/**
 * Convenience function to load a cartridge from JSON
 */
export declare function loadCartridge(jsonString: string, options?: CartridgeLoadOptions): Promise<LoadedCartridge>;
//# sourceMappingURL=cartridge-loader.d.ts.map