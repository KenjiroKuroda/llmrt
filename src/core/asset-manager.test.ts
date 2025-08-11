/**
 * Asset Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AssetManager, AssetLoadProgress } from './asset-manager.js';
import { SpriteAsset, FontAsset, AssetManifest } from '../types/core.js';

// Mock Image constructor
const mockImage = {
  onload: null as any,
  onerror: null as any,
  src: '',
  width: 0,
  height: 0,
  crossOrigin: ''
};

// Mock FontFace constructor
const mockFontFace = {
  load: vi.fn()
};

// Mock document.fonts
const mockDocumentFonts = {
  add: vi.fn()
};

describe('AssetManager', () => {
  let assetManager: AssetManager;
  let mockAssets: AssetManifest;

  beforeEach(() => {
    // Setup mocks before creating AssetManager
    global.Image = vi.fn(() => mockImage) as any;
    global.FontFace = vi.fn(() => mockFontFace) as any;
    (global as any).document = {
      createElement: vi.fn(() => ({
        width: 1,
        height: 1,
        getContext: vi.fn(() => null), // Return null to trigger fallback
        toDataURL: vi.fn(() => 'data:image/png;base64,test')
      })),
      fonts: mockDocumentFonts
    };
    
    assetManager = new AssetManager();

    mockAssets = {
      sprites: [
        {
          id: 'player',
          url: 'sprites/player.png',
          width: 32,
          height: 32,
          frames: 4
        },
        {
          id: 'enemy',
          url: 'sprites/enemy.png',
          width: 16,
          height: 16
        }
      ],
      audio: [], // Not handled by AssetManager
      fonts: [
        {
          id: 'game-font',
          family: 'GameFont',
          url: 'fonts/game-font.woff2'
        }
      ]
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Sprite Loading', () => {
    it('should load sprite assets successfully', async () => {
      const loadPromise = assetManager.loadSpriteAsset(mockAssets.sprites[0]);
      
      // Simulate successful image load
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.width = 32;
          mockImage.height = 32;
          mockImage.onload();
        }
      }, 10);

      const result = await loadPromise;
      
      expect(result.id).toBe('player');
      expect(result.width).toBe(32);
      expect(result.height).toBe(32);
      expect(result.frames).toBe(4);
      expect(result.image).toBe(mockImage);
    });

    it('should handle sprite loading errors', async () => {
      // Create a new mock that will fail immediately
      const failingImage = {
        ...mockImage,
        onload: null as any,
        onerror: null as any,
        set src(value: string) {
          // Trigger error immediately when src is set
          setTimeout(() => {
            if (this.onerror) {
              this.onerror();
            }
          }, 0);
        }
      };
      
      global.Image = vi.fn(() => failingImage) as any;
      
      await expect(assetManager.loadSpriteAsset(mockAssets.sprites[0])).rejects.toThrow('Failed to load sprite');
    });

    it('should handle sprite loading timeout', async () => {
      const loadPromise = assetManager.loadSpriteAsset(mockAssets.sprites[0], 100); // 100ms timeout
      
      // Don't trigger onload or onerror - let it timeout
      
      await expect(loadPromise).rejects.toThrow('Sprite load timeout');
    });

    it('should retry sprite loading on failure', async () => {
      let attemptCount = 0;
      const originalImage = global.Image;
      
      global.Image = vi.fn(() => {
        attemptCount++;
        const img = {
          ...mockImage,
          onload: null as any,
          onerror: null as any
        };
        
        // Set up immediate response based on attempt
        setTimeout(() => {
          if (attemptCount < 3 && img.onerror) {
            img.onerror(); // Fail first 2 attempts
          } else if (img.onload) {
            img.width = 32;
            img.height = 32;
            img.onload(); // Succeed on 3rd attempt
          }
        }, 1);
        
        return img;
      }) as any;

      const result = await assetManager.loadSpriteAsset(mockAssets.sprites[0], 1000, 2);
      
      expect(attemptCount).toBe(3);
      expect(result.id).toBe('player');
      
      global.Image = originalImage;
    });

    it('should cache loaded sprites', async () => {
      const loadPromise1 = assetManager.loadSpriteAsset(mockAssets.sprites[0]);
      
      // Simulate successful load immediately
      if (mockImage.onload) {
        mockImage.width = 32;
        mockImage.height = 32;
        mockImage.onload();
      }

      await loadPromise1;
      
      // Second load should return cached result immediately
      const result2 = await assetManager.loadSpriteAsset(mockAssets.sprites[0]);
      expect(result2.id).toBe('player');
    });

    it('should get sprite with fallback', () => {
      const sprite = assetManager.getSpriteWithFallback('nonexistent');
      expect(sprite).toBeDefined();
    });
  });

  describe('Font Loading', () => {
    it('should load font assets successfully', async () => {
      mockFontFace.load.mockResolvedValue(undefined);
      
      const result = await assetManager.loadFontAsset(mockAssets.fonts[0]);
      
      expect(result.id).toBe('game-font');
      expect(result.family).toBe('GameFont');
      expect(result.loaded).toBe(true);
      expect(mockDocumentFonts.add).toHaveBeenCalled();
    });

    it('should handle font loading errors', async () => {
      mockFontFace.load.mockRejectedValue(new Error('Font load failed'));
      
      await expect(assetManager.loadFontAsset(mockAssets.fonts[0])).rejects.toThrow('Failed to load font');
    });

    it('should handle font loading timeout', async () => {
      mockFontFace.load.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      await expect(assetManager.loadFontAsset(mockAssets.fonts[0], 100)).rejects.toThrow('Font load timeout');
    });

    it('should fallback for browsers without FontFace API', async () => {
      const originalFontFace = global.FontFace;
      (global as any).FontFace = undefined;
      
      const result = await assetManager.loadFontAsset(mockAssets.fonts[0]);
      
      expect(result.id).toBe('game-font');
      expect(result.family).toBe('GameFont');
      expect(result.loaded).toBe(true);
      
      global.FontFace = originalFontFace;
    });

    it('should get font with fallback', () => {
      const font = assetManager.getFontWithFallback('nonexistent');
      expect(font).toBe('Arial, sans-serif');
    });
  });

  describe('Batch Asset Loading', () => {
    it('should load all assets with progress tracking', async () => {
      const progressUpdates: AssetLoadProgress[] = [];
      
      // Mock successful asset loading
      vi.spyOn(assetManager, 'loadSpriteAsset').mockResolvedValue({
        id: 'test',
        image: mockImage,
        width: 32,
        height: 32,
        frames: 1
      });
      
      vi.spyOn(assetManager, 'loadFontAsset').mockResolvedValue({
        id: 'test',
        family: 'TestFont',
        loaded: true
      });

      await assetManager.loadAssets(mockAssets, {
        onProgress: (progress) => {
          progressUpdates.push({ ...progress });
        }
      });
      
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].total).toBe(3); // 2 sprites + 1 font
      expect(progressUpdates[progressUpdates.length - 1].progress).toBe(1);
    });

    it('should handle mixed success and failure', async () => {
      const progressUpdates: AssetLoadProgress[] = [];
      
      // Mock mixed results
      vi.spyOn(assetManager, 'loadSpriteAsset')
        .mockResolvedValueOnce({
          id: 'player',
          image: mockImage,
          width: 32,
          height: 32,
          frames: 1
        })
        .mockRejectedValueOnce(new Error('Sprite failed'));
      
      vi.spyOn(assetManager, 'loadFontAsset').mockRejectedValue(new Error('Font failed'));

      await assetManager.loadAssets(mockAssets, {
        onProgress: (progress) => {
          progressUpdates.push({ ...progress });
        }
      });
      
      const finalProgress = progressUpdates[progressUpdates.length - 1];
      expect(finalProgress.loaded).toBeGreaterThan(0);
      expect(finalProgress.failed).toBeGreaterThan(0);
    });
  });

  describe('Memory Management', () => {
    it('should track memory usage', async () => {
      const loadPromise = assetManager.loadSpriteAsset(mockAssets.sprites[0]);
      
      // Simulate successful load immediately
      if (mockImage.onload) {
        mockImage.width = 32;
        mockImage.height = 32;
        mockImage.onload();
      }

      await loadPromise;
      
      const usage = assetManager.getMemoryUsage();
      expect(usage.sprites).toBeGreaterThan(0);
      expect(usage.total).toBeGreaterThan(0);
    });

    it('should clear cache', async () => {
      const loadPromise = assetManager.loadSpriteAsset(mockAssets.sprites[0]);
      
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.width = 32;
          mockImage.height = 32;
          mockImage.onload();
        }
      }, 10);

      await loadPromise;
      
      expect(assetManager.isAssetLoaded('player', 'sprite')).toBe(true);
      
      assetManager.clearCache();
      
      expect(assetManager.isAssetLoaded('player', 'sprite')).toBe(false);
    });
  });

  describe('Asset Retrieval', () => {
    it('should check if assets are loaded', async () => {
      expect(assetManager.isAssetLoaded('player', 'sprite')).toBe(false);
      
      const loadPromise = assetManager.loadSpriteAsset(mockAssets.sprites[0]);
      
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.width = 32;
          mockImage.height = 32;
          mockImage.onload();
        }
      }, 10);

      await loadPromise;
      
      expect(assetManager.isAssetLoaded('player', 'sprite')).toBe(true);
    });

    it('should get loaded assets', async () => {
      const loadPromise = assetManager.loadSpriteAsset(mockAssets.sprites[0]);
      
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.width = 32;
          mockImage.height = 32;
          mockImage.onload();
        }
      }, 10);

      await loadPromise;
      
      const sprite = assetManager.getSprite('player');
      expect(sprite).toBeDefined();
      expect(sprite?.id).toBe('player');
    });

    it('should return null for non-existent assets', () => {
      const sprite = assetManager.getSprite('nonexistent');
      expect(sprite).toBeNull();
      
      const font = assetManager.getFont('nonexistent');
      expect(font).toBeNull();
    });
  });
});