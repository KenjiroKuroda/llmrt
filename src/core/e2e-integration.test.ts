/**
 * End-to-End Integration Tests
 * Tests the complete engine with all modules enabled
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LLMRTEngineImpl } from './engine';
import { validateCartridge } from './validator';
import { PerformanceMonitor } from './performance-monitor';

// Mock window.matchMedia for accessibility manager
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('End-to-End Integration Tests', () => {
  let engine: LLMRTEngineImpl;
  let canvas: HTMLCanvasElement;
  let performanceMonitor: PerformanceMonitor;

  beforeEach(() => {
    // Create test canvas
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    document.body.appendChild(canvas);

    // Initialize engine with all modules
    engine = new LLMRTEngineImpl();

    performanceMonitor = new PerformanceMonitor();
  });

  afterEach(() => {
    engine?.stop();
    document.body.removeChild(canvas);
    if (performanceMonitor && typeof performanceMonitor.stop === 'function') {
      performanceMonitor.stop();
    }
  });

  describe('Complete Cartridge Loading and Execution', () => {
    it('should load and run simple test cartridge', async () => {
      const testCartridge = {
        version: "1.0",
        metadata: { title: "Test Game", author: "Test", description: "Simple test" },
        theme: {
          colors: { primary: "#ff0000", secondary: "#00ff00", background: "#000000", text: "#ffffff", accent: "#ffff00" },
          font: { family: "Arial", sizes: { small: 12, medium: 16, large: 24 } },
          spacing: { small: 4, medium: 8, large: 16 },
          radii: { small: 2, medium: 4, large: 8 }
        },
        scenes: [{
          id: "main",
          root: {
            id: "root", type: "Group",
            transform: { position: [0, 0], scale: [1, 1], rotation: 0, skew: [0, 0], alpha: 1 },
            visible: true,
            children: [{
              id: "sprite", type: "Sprite",
              transform: { position: [100, 100], scale: [1, 1], rotation: 0, skew: [0, 0], alpha: 1 },
              visible: true, children: [], actions: [], triggers: [],
              sprite: "test-sprite"
            }],
            actions: [], triggers: []
          }
        }],
        assets: {
          sprites: [{ id: "test-sprite", url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" }],
          audio: [], fonts: []
        },
        variables: {}
      };
      
      // Validate cartridge
      const validation = validateCartridge(testCartridge);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Load and start
      await engine.loadCartridge(testCartridge);
      engine.start();

      // Let it run for a few frames
      await new Promise(resolve => setTimeout(resolve, 50));

      const state = engine.getState();
      expect(state.running).toBe(true);
      expect(state.currentScene).toBeDefined();
    });
  });

  describe('Cross-Module Integration', () => {
    it('should handle cartridge with multiple modules simultaneously', async () => {
      const multiModuleCartridge = {
        version: "1.0",
        metadata: {
          title: "Multi-Module Test",
          author: "Test",
          description: "Tests multiple modules together"
        },
        theme: {
          colors: {
            primary: "#ff0000",
            secondary: "#00ff00",
            background: "#000000",
            text: "#ffffff",
            accent: "#ffff00"
          },
          font: {
            family: "Arial",
            sizes: { small: 12, medium: 16, large: 24 }
          },
          spacing: { small: 4, medium: 8, large: 16 },
          radii: { small: 2, medium: 4, large: 8 }
        },
        scenes: [{
          id: "main",
          root: {
            id: "root",
            type: "Group",
            transform: { position: [0, 0], scale: [1, 1], rotation: 0, skew: [0, 0], alpha: 1 },
            visible: true,
            children: [
              {
                id: "mode7-plane",
                type: "Group",
                transform: { position: [0, 0], scale: [1, 1], rotation: 0, skew: [0, 0], alpha: 1 },
                visible: true,
                children: [],
                actions: [],
                triggers: [],
                texture: "ground",
                horizon: 0.5,
                scale: 1.0,
                offset: [0, 0]
              },
              {
                id: "particles",
                type: "Particles2D",
                transform: { position: [400, 300], scale: [1, 1], rotation: 0, skew: [0, 0], alpha: 1 },
                visible: true,
                children: [],
                actions: [],
                triggers: [],
                emitter: {
                  rate: 10,
                  lifetime: 2.0,
                  sprite: "particle",
                  velocity: { min: [-50, -50], max: [50, 50] },
                  acceleration: [0, 100]
                }
              }
            ],
            actions: [],
            triggers: []
          }
        }],
        assets: {
          sprites: [
            { id: "ground", url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" },
            { id: "particle", url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" }
          ],
          audio: [],
          fonts: []
        },
        variables: {}
      };

      const validation = validateCartridge(multiModuleCartridge);
      expect(validation.valid).toBe(true);

      await engine.loadCartridge(multiModuleCartridge);
      engine.start();

      await new Promise(resolve => setTimeout(resolve, 100));

      const state = engine.getState();
      expect(state.running).toBe(true);
      expect(state.currentScene).toBeDefined();
    });
  });

  describe('Performance Validation', () => {
    it('should load and run without crashing', async () => {
      const testCartridge = {
        version: "1.0",
        metadata: { title: "Performance Test", author: "Test", description: "Performance test" },
        theme: {
          colors: { primary: "#ff0000", secondary: "#00ff00", background: "#000000", text: "#ffffff", accent: "#ffff00" },
          font: { family: "Arial", sizes: { small: 12, medium: 16, large: 24 } },
          spacing: { small: 4, medium: 8, large: 16 },
          radii: { small: 2, medium: 4, large: 8 }
        },
        scenes: [{
          id: "perf",
          root: {
            id: "root", type: "Group",
            transform: { position: [0, 0], scale: [1, 1], rotation: 0, skew: [0, 0], alpha: 1 },
            visible: true,
            children: Array.from({ length: 10 }, (_, i) => ({
              id: `sprite-${i}`, type: "Sprite",
              transform: { position: [i * 50, 100], scale: [1, 1], rotation: 0, skew: [0, 0], alpha: 1 },
              visible: true, children: [], actions: [], triggers: [],
              sprite: "test-sprite"
            })),
            actions: [], triggers: []
          }
        }],
        assets: {
          sprites: [{ id: "test-sprite", url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" }],
          audio: [], fonts: []
        },
        variables: {}
      };

      await engine.loadCartridge(testCartridge);
      engine.start();

      await new Promise(resolve => setTimeout(resolve, 100));

      const state = engine.getState();
      expect(state.running).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle invalid cartridge gracefully', async () => {
      const invalidCartridge = {
        version: "1.0",
        // Missing required fields
      };

      const validation = validateCartridge(invalidCartridge);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);

      // Engine should not crash when loading invalid cartridge
      await expect(engine.loadCartridge(invalidCartridge)).rejects.toThrow();
      
      // Engine should still be in a valid state
      const state = engine.getState();
      expect(state.running).toBe(false);
    });

    it('should recover from asset loading failures', async () => {
      const cartridgeWithBadAssets = {
        version: "1.0",
        metadata: { title: "Bad Assets Test", author: "Test", description: "Test" },
        theme: {
          colors: { primary: "#ff0000", secondary: "#00ff00", background: "#000000", text: "#ffffff", accent: "#ffff00" },
          font: { family: "Arial", sizes: { small: 12, medium: 16, large: 24 } },
          spacing: { small: 4, medium: 8, large: 16 },
          radii: { small: 2, medium: 4, large: 8 }
        },
        scenes: [{
          id: "main",
          root: {
            id: "root",
            type: "Group",
            transform: { position: [0, 0], scale: [1, 1], rotation: 0, skew: [0, 0], alpha: 1 },
            visible: true,
            children: [{
              id: "sprite",
              type: "Sprite",
              transform: { position: [100, 100], scale: [1, 1], rotation: 0, skew: [0, 0], alpha: 1 },
              visible: true,
              children: [],
              actions: [],
              triggers: [],
              sprite: "missing-sprite"
            }],
            actions: [],
            triggers: []
          }
        }],
        assets: {
          sprites: [{ id: "missing-sprite", url: "https://invalid-url/missing.png" }],
          audio: [],
          fonts: []
        },
        variables: {}
      };

      // Should load but with fallback assets
      await engine.loadCartridge(cartridgeWithBadAssets);
      engine.start();

      await new Promise(resolve => setTimeout(resolve, 100));

      const state = engine.getState();
      expect(state.running).toBe(true);
      // Should continue running despite asset loading issues
      expect(state.currentScene).toBeDefined();
    });
  });
});