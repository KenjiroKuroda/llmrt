/**
 * Cartridge Loading System
 * Handles loading, parsing, and validation of LGF cartridges
 */

import { LGFCartridge } from '../types/core.js';
import { validateCartridge, ValidationResult } from './validator.js';
import { AssetManager, AssetLoadProgress, AssetLoadOptions } from './asset-manager.js';
import { AudioManager } from './audio-manager.js';

export interface CartridgeLoadProgress {
  stage: 'parsing' | 'validating' | 'loading-assets';
  progress: number; // 0-1
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

export class CartridgeLoader {
  private assetManager: AssetManager;
  private audioManager: AudioManager;

  constructor(assetManager?: AssetManager, audioManager?: AudioManager) {
    this.assetManager = assetManager || new AssetManager();
    this.audioManager = audioManager || new AudioManager();
  }

  /**
   * Load a cartridge from JSON string
   */
  async loadFromJSON(jsonString: string, options: CartridgeLoadOptions = {}): Promise<LoadedCartridge> {
    const { onProgress, validateOnly = false, skipAssets = false } = options;

    // Stage 1: Parse JSON
    if (onProgress) {
      onProgress({
        stage: 'parsing',
        progress: 0,
        message: 'Parsing cartridge JSON...'
      });
    }

    let cartridge: any;
    try {
      cartridge = JSON.parse(jsonString);
    } catch (error) {
      throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown parsing error'}`);
    }

    if (onProgress) {
      onProgress({
        stage: 'parsing',
        progress: 1,
        message: 'JSON parsed successfully'
      });
    }

    // Stage 2: Validate cartridge
    if (onProgress) {
      onProgress({
        stage: 'validating',
        progress: 0,
        message: 'Validating cartridge format...'
      });
    }

    const validation = validateCartridge(cartridge);
    
    if (onProgress) {
      onProgress({
        stage: 'validating',
        progress: 1,
        message: validation.valid ? 'Validation successful' : `Validation failed with ${validation.errors.length} errors`
      });
    }

    if (!validation.valid) {
      throw new Error(`Cartridge validation failed:\n${validation.errors.map(e => `- ${e.path}: ${e.message}`).join('\n')}`);
    }

    if (validateOnly) {
      return {
        cartridge: cartridge as LGFCartridge,
        validation,
        assetManager: this.assetManager,
        audioManager: this.audioManager
      };
    }

    // Stage 3: Load assets
    if (!skipAssets && cartridge.assets) {
      if (onProgress) {
        onProgress({
          stage: 'loading-assets',
          progress: 0,
          message: 'Loading assets...'
        });
      }

      await this.loadCartridgeAssets(cartridge as LGFCartridge, {
        onProgress: (assetProgress) => {
          if (onProgress) {
            onProgress({
              stage: 'loading-assets',
              progress: assetProgress.progress,
              message: `Loading assets... (${assetProgress.loaded}/${assetProgress.total})`,
              assetProgress
            });
          }
        },
        timeout: options.assetTimeout,
        retryCount: options.assetRetryCount
      });
    }

    return {
      cartridge: cartridge as LGFCartridge,
      validation,
      assetManager: this.assetManager,
      audioManager: this.audioManager
    };
  }

  /**
   * Load a cartridge from a URL
   */
  async loadFromURL(url: string, options: CartridgeLoadOptions = {}): Promise<LoadedCartridge> {
    const { onProgress } = options;

    if (onProgress) {
      onProgress({
        stage: 'parsing',
        progress: 0,
        message: `Fetching cartridge from ${url}...`
      });
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const jsonString = await response.text();
      
      if (onProgress) {
        onProgress({
          stage: 'parsing',
          progress: 0.5,
          message: 'Cartridge downloaded, parsing...'
        });
      }

      return await this.loadFromJSON(jsonString, options);
    } catch (error) {
      throw new Error(`Failed to load cartridge from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load a cartridge from a File object (for file uploads)
   */
  async loadFromFile(file: File, options: CartridgeLoadOptions = {}): Promise<LoadedCartridge> {
    const { onProgress } = options;

    if (onProgress) {
      onProgress({
        stage: 'parsing',
        progress: 0,
        message: `Reading file ${file.name}...`
      });
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const jsonString = event.target?.result as string;
          
          if (onProgress) {
            onProgress({
              stage: 'parsing',
              progress: 0.5,
              message: 'File read, parsing...'
            });
          }

          const result = await this.loadFromJSON(jsonString, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${reader.error?.message || 'Unknown error'}`));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Validate a cartridge without loading assets
   */
  async validateCartridge(cartridge: string | object): Promise<ValidationResult> {
    let parsedCartridge: any;

    if (typeof cartridge === 'string') {
      try {
        parsedCartridge = JSON.parse(cartridge);
      } catch (error) {
        return {
          valid: false,
          errors: [{
            path: '',
            message: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown parsing error'}`,
            code: 'JSON_PARSE_ERROR'
          }],
          warnings: []
        };
      }
    } else {
      parsedCartridge = cartridge;
    }

    return validateCartridge(parsedCartridge);
  }

  /**
   * Get asset manager instance
   */
  getAssetManager(): AssetManager {
    return this.assetManager;
  }

  /**
   * Get audio manager instance
   */
  getAudioManager(): AudioManager {
    return this.audioManager;
  }

  /**
   * Clear all cached assets
   */
  clearCache(): void {
    this.assetManager.clearCache();
    this.audioManager.cleanup();
  }

  /**
   * Get memory usage statistics
   */
  getMemoryUsage(): { assets: any; audio: number; total: number } {
    const assetMemory = this.assetManager.getMemoryUsage();
    const audioMemory = 0; // AudioManager doesn't expose memory usage yet
    
    return {
      assets: assetMemory,
      audio: audioMemory,
      total: assetMemory.total + audioMemory
    };
  }

  private async loadCartridgeAssets(cartridge: LGFCartridge, options: AssetLoadOptions): Promise<void> {
    const promises: Promise<void>[] = [];

    // Load sprite and font assets through AssetManager
    if (cartridge.assets.sprites.length > 0 || cartridge.assets.fonts.length > 0) {
      promises.push(
        this.assetManager.loadAssets({
          sprites: cartridge.assets.sprites,
          audio: [], // Audio handled separately
          fonts: cartridge.assets.fonts
        }, options).catch(error => {
          console.warn('Asset loading failed:', error);
          // Don't throw - allow cartridge to load with missing assets
        })
      );
    }

    // Load audio assets through AudioManager
    if (cartridge.assets.audio.length > 0) {
      promises.push(
        this.audioManager.loadAssets(cartridge.assets.audio).catch(error => {
          console.warn('Audio asset loading failed:', error);
          // Don't throw - allow cartridge to load with missing audio
        })
      );
    }

    await Promise.allSettled(promises);
  }
}

/**
 * Convenience function to create a cartridge loader
 */
export function createCartridgeLoader(assetManager?: AssetManager, audioManager?: AudioManager): CartridgeLoader {
  return new CartridgeLoader(assetManager, audioManager);
}

/**
 * Convenience function to load a cartridge from JSON
 */
export async function loadCartridge(jsonString: string, options?: CartridgeLoadOptions): Promise<LoadedCartridge> {
  const loader = new CartridgeLoader();
  return loader.loadFromJSON(jsonString, options);
}