/**
 * Cartridge Loader Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CartridgeLoader, CartridgeLoadProgress } from './cartridge-loader.js';
import { AssetManager } from './asset-manager.js';
import { AudioManager } from './audio-manager.js';
import { LGFCartridge } from '../types/core.js';

describe('CartridgeLoader', () => {
  let cartridgeLoader: CartridgeLoader;
  let mockAssetManager: AssetManager;
  let mockAudioManager: AudioManager;
  let validCartridge: LGFCartridge;
  let validCartridgeJSON: string;

  beforeEach(() => {
    // Create mock managers
    mockAssetManager = {
      loadAssets: vi.fn().mockResolvedValue(undefined),
      clearCache: vi.fn(),
      getMemoryUsage: vi.fn().mockReturnValue({ sprites: 0, fonts: 0, total: 0 })
    } as any;

    mockAudioManager = {
      loadAssets: vi.fn().mockResolvedValue(undefined),
      cleanup: vi.fn()
    } as any;

    cartridgeLoader = new CartridgeLoader(mockAssetManager, mockAudioManager);

    // Create valid test cartridge
    validCartridge = {
      version: '1.0',
      metadata: {
        title: 'Test Game',
        author: 'Test Author',
        description: 'A test game'
      },
      theme: {
        colors: {
          primary: '#FF0000',
          secondary: '#00FF00',
          background: '#0000FF',
          text: '#FFFFFF',
          accent: '#FFFF00'
        },
        font: {
          family: 'Arial',
          sizes: { small: 12, medium: 16, large: 24 }
        },
        spacing: { small: 4, medium: 8, large: 16 },
        radii: { small: 2, medium: 4, large: 8 }
      },
      scenes: [
        {
          id: 'main',
          root: {
            id: 'root',
            type: 'Group',
            transform: {
              position: { x: 0, y: 0 },
              scale: { x: 1, y: 1 },
              rotation: 0,
              skew: { x: 0, y: 0 },
              alpha: 1
            },
            visible: true,
            children: [],
            actions: [],
            triggers: []
          }
        }
      ],
      assets: {
        sprites: [
          {
            id: 'player',
            url: 'sprites/player.png',
            width: 32,
            height: 32,
            frames: 4
          }
        ],
        audio: [
          {
            id: 'bgm',
            url: 'audio/bgm.mp3',
            type: 'music'
          }
        ],
        fonts: [
          {
            id: 'game-font',
            family: 'GameFont',
            url: 'fonts/game-font.woff2'
          }
        ]
      },
      variables: {
        score: 0,
        lives: 3
      }
    };

    validCartridgeJSON = JSON.stringify(validCartridge);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('JSON Loading', () => {
    it('should load valid cartridge from JSON', async () => {
      const result = await cartridgeLoader.loadFromJSON(validCartridgeJSON);
      
      expect(result.cartridge).toEqual(validCartridge);
      expect(result.validation.valid).toBe(true);
      expect(result.validation.errors).toHaveLength(0);
      expect(mockAssetManager.loadAssets).toHaveBeenCalled();
      expect(mockAudioManager.loadAssets).toHaveBeenCalled();
    });

    it('should handle invalid JSON', async () => {
      const invalidJSON = '{ invalid json }';
      
      await expect(cartridgeLoader.loadFromJSON(invalidJSON)).rejects.toThrow('Invalid JSON');
    });

    it('should handle validation errors', async () => {
      const invalidCartridge = { ...validCartridge, version: '2.0' }; // Invalid version
      const invalidJSON = JSON.stringify(invalidCartridge);
      
      await expect(cartridgeLoader.loadFromJSON(invalidJSON)).rejects.toThrow('Cartridge validation failed');
    });

    it('should track loading progress', async () => {
      const progressUpdates: CartridgeLoadProgress[] = [];
      
      await cartridgeLoader.loadFromJSON(validCartridgeJSON, {
        onProgress: (progress) => {
          progressUpdates.push({ ...progress });
        }
      });
      
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates.some(p => p.stage === 'parsing')).toBe(true);
      expect(progressUpdates.some(p => p.stage === 'validating')).toBe(true);
      expect(progressUpdates.some(p => p.stage === 'loading-assets')).toBe(true);
    });

    it('should support validate-only mode', async () => {
      const result = await cartridgeLoader.loadFromJSON(validCartridgeJSON, {
        validateOnly: true
      });
      
      expect(result.cartridge).toEqual(validCartridge);
      expect(result.validation.valid).toBe(true);
      expect(mockAssetManager.loadAssets).not.toHaveBeenCalled();
      expect(mockAudioManager.loadAssets).not.toHaveBeenCalled();
    });

    it('should support skip-assets mode', async () => {
      const result = await cartridgeLoader.loadFromJSON(validCartridgeJSON, {
        skipAssets: true
      });
      
      expect(result.cartridge).toEqual(validCartridge);
      expect(result.validation.valid).toBe(true);
      expect(mockAssetManager.loadAssets).not.toHaveBeenCalled();
      expect(mockAudioManager.loadAssets).not.toHaveBeenCalled();
    });
  });

  describe('URL Loading', () => {
    beforeEach(() => {
      // Mock fetch
      global.fetch = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should load cartridge from URL', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(validCartridgeJSON)
      });

      const result = await cartridgeLoader.loadFromURL('http://example.com/game.lgf');
      
      expect(result.cartridge).toEqual(validCartridge);
      expect(global.fetch).toHaveBeenCalledWith('http://example.com/game.lgf');
    });

    it('should handle fetch errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(cartridgeLoader.loadFromURL('http://example.com/missing.lgf'))
        .rejects.toThrow('HTTP 404: Not Found');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await expect(cartridgeLoader.loadFromURL('http://example.com/game.lgf'))
        .rejects.toThrow('Failed to load cartridge from URL');
    });
  });

  describe('File Loading', () => {
    it('should load cartridge from File object', async () => {
      const mockFile = new File([validCartridgeJSON], 'game.lgf', { type: 'application/json' });
      
      // Mock FileReader
      const mockFileReader = {
        onload: null as any,
        onerror: null as any,
        readAsText: vi.fn(),
        result: validCartridgeJSON
      };

      global.FileReader = vi.fn(() => mockFileReader) as any;

      const loadPromise = cartridgeLoader.loadFromFile(mockFile);
      
      // Simulate successful file read
      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: validCartridgeJSON } });
        }
      }, 10);

      const result = await loadPromise;
      
      expect(result.cartridge).toEqual(validCartridge);
      expect(mockFileReader.readAsText).toHaveBeenCalledWith(mockFile);
    });

    it('should handle file read errors', async () => {
      const mockFile = new File([''], 'game.lgf', { type: 'application/json' });
      
      const mockFileReader = {
        onload: null as any,
        onerror: null as any,
        readAsText: vi.fn(),
        error: { message: 'File read error' }
      };

      global.FileReader = vi.fn(() => mockFileReader) as any;

      const loadPromise = cartridgeLoader.loadFromFile(mockFile);
      
      // Simulate file read error
      setTimeout(() => {
        if (mockFileReader.onerror) {
          mockFileReader.onerror();
        }
      }, 10);

      await expect(loadPromise).rejects.toThrow('Failed to read file');
    });
  });

  describe('Validation', () => {
    it('should validate JSON string', async () => {
      const result = await cartridgeLoader.validateCartridge(validCartridgeJSON);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate object', async () => {
      const result = await cartridgeLoader.validateCartridge(validCartridge);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle invalid JSON in validation', async () => {
      const result = await cartridgeLoader.validateCartridge('{ invalid json }');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('JSON_PARSE_ERROR');
    });

    it('should handle validation errors', async () => {
      const invalidCartridge = { ...validCartridge, version: '2.0' };
      const result = await cartridgeLoader.validateCartridge(invalidCartridge);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Asset Loading Integration', () => {
    it('should load assets through managers', async () => {
      await cartridgeLoader.loadFromJSON(validCartridgeJSON);
      
      expect(mockAssetManager.loadAssets).toHaveBeenCalledWith(
        {
          sprites: validCartridge.assets.sprites,
          audio: [],
          fonts: validCartridge.assets.fonts
        },
        expect.any(Object)
      );
      
      expect(mockAudioManager.loadAssets).toHaveBeenCalledWith(
        validCartridge.assets.audio
      );
    });

    it('should handle asset loading errors gracefully', async () => {
      mockAssetManager.loadAssets = vi.fn().mockRejectedValue(new Error('Asset load failed'));
      
      // Should not throw - asset loading errors are handled gracefully
      const result = await cartridgeLoader.loadFromJSON(validCartridgeJSON);
      expect(result.cartridge).toEqual(validCartridge);
    });

    it('should pass asset loading options', async () => {
      const options = {
        assetTimeout: 5000,
        assetRetryCount: 3
      };
      
      await cartridgeLoader.loadFromJSON(validCartridgeJSON, options);
      
      expect(mockAssetManager.loadAssets).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          timeout: 5000,
          retryCount: 3
        })
      );
    });
  });

  describe('Memory Management', () => {
    it('should clear cache', () => {
      cartridgeLoader.clearCache();
      
      expect(mockAssetManager.clearCache).toHaveBeenCalled();
      expect(mockAudioManager.cleanup).toHaveBeenCalled();
    });

    it('should get memory usage', () => {
      const usage = cartridgeLoader.getMemoryUsage();
      
      expect(usage).toHaveProperty('assets');
      expect(usage).toHaveProperty('audio');
      expect(usage).toHaveProperty('total');
      expect(mockAssetManager.getMemoryUsage).toHaveBeenCalled();
    });
  });

  describe('Manager Access', () => {
    it('should provide access to asset manager', () => {
      const assetManager = cartridgeLoader.getAssetManager();
      expect(assetManager).toBe(mockAssetManager);
    });

    it('should provide access to audio manager', () => {
      const audioManager = cartridgeLoader.getAudioManager();
      expect(audioManager).toBe(mockAudioManager);
    });
  });

  describe('Convenience Functions', () => {
    it('should create cartridge loader', async () => {
      // Setup DOM mocks
      (global as any).document = {
        createElement: vi.fn(() => ({
          width: 1,
          height: 1,
          getContext: vi.fn(() => null),
          toDataURL: vi.fn(() => 'data:image/png;base64,test')
        })),
        fonts: { add: vi.fn() },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      };

      const { createCartridgeLoader } = await import('./cartridge-loader.js');
      const loader = createCartridgeLoader();
      
      expect(loader).toBeInstanceOf(CartridgeLoader);
    });

    it('should load cartridge with convenience function', async () => {
      // Setup DOM mocks for the convenience function
      (global as any).document = {
        createElement: vi.fn(() => ({
          width: 1,
          height: 1,
          getContext: vi.fn(() => null), // Return null to trigger fallback
          toDataURL: vi.fn(() => 'data:image/png;base64,test')
        })),
        fonts: {
          add: vi.fn()
        },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      };

      const { loadCartridge } = await import('./cartridge-loader.js');
      const result = await loadCartridge(validCartridgeJSON, { skipAssets: true });
      expect(result.cartridge).toEqual(validCartridge);
    });
  });
});