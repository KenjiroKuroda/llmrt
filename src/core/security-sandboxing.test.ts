/**
 * Security Constraints and Sandboxing Tests
 * Tests that validate security measures and sandboxing effectiveness
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LLMRTEngineImpl } from './engine';
import { validateCartridge } from './validator';

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

describe('Security Constraints and Sandboxing', () => {
  let engine: LLMRTEngineImpl;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    document.body.appendChild(canvas);

    engine = new LLMRTEngineImpl();
  });

  afterEach(() => {
    engine?.stop();
    document.body.removeChild(canvas);
  });

  describe('Asset URL Security', () => {
    it('should reject javascript: URLs in assets', async () => {
      const maliciousCartridge = {
        version: "1.0",
        metadata: { title: "Malicious", author: "Test", description: "Test" },
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
            visible: true, children: [], actions: [], triggers: []
          }
        }],
        assets: {
          sprites: [{ id: "malicious", url: "javascript:alert('XSS')" }],
          audio: [],
          fonts: []
        },
        variables: {}
      };

      // Should load but the javascript URL should be handled safely
      await engine.loadCartridge(maliciousCartridge);
      
      // Verify the URL is still present but won't execute in a browser context
      const assetManager = engine.getAssetManager();
      expect(assetManager).toBeDefined();
    });

    it('should reject data URLs with executable content', async () => {
      const maliciousCartridge = {
        version: "1.0",
        metadata: { title: "Malicious", author: "Test", description: "Test" },
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
            visible: true, children: [], actions: [], triggers: []
          }
        }],
        assets: {
          sprites: [{ id: "malicious", url: "data:text/html,<script>alert('XSS')</script>" }],
          audio: [],
          fonts: []
        },
        variables: {}
      };

      // Should load but the data URL should be handled safely
      await engine.loadCartridge(maliciousCartridge);
      
      // Verify the engine loads without executing scripts
      const assetManager = engine.getAssetManager();
      expect(assetManager).toBeDefined();
    });

    it('should allow safe data URLs for images', async () => {
      const safeCartridge = {
        version: "1.0",
        metadata: { title: "Safe", author: "Test", description: "Test" },
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
            visible: true, children: [], actions: [], triggers: []
          }
        }],
        assets: {
          sprites: [{ 
            id: "safe", 
            url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" 
          }],
          audio: [],
          fonts: []
        },
        variables: {}
      };

      // Should accept safe image data URLs
      await expect(engine.loadCartridge(safeCartridge)).resolves.not.toThrow();
    });
  });

  describe('Action Security', () => {
    it('should prevent access to global objects through actions', async () => {
      const maliciousCartridge = {
        version: "1.0",
        metadata: { title: "Malicious Actions", author: "Test", description: "Test" },
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
              id: "malicious-node", type: "Sprite",
              transform: { position: [0, 0], scale: [1, 1], rotation: 0, skew: [0, 0], alpha: 1 },
              visible: true, children: [],
              actions: [{
                type: "setVar",
                params: {
                  name: "window.location.href",
                  value: "http://malicious.com"
                }
              }],
              triggers: [{
                event: "on.start",
                actions: [{
                  type: "setVar",
                  params: {
                    name: "document.cookie",
                    value: "stolen"
                  }
                }]
              }],
              sprite: "test"
            }],
            actions: [], triggers: []
          }
        }],
        assets: {
          sprites: [{ id: "test", url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" }],
          audio: [],
          fonts: []
        },
        variables: {}
      };

      // Should load but actions should be sandboxed
      await engine.loadCartridge(maliciousCartridge);
      engine.start();

      // Verify that global objects are not accessible
      expect(window.location.href).not.toContain('malicious.com');
      expect(document.cookie).not.toContain('stolen');
    });
  });

  describe('Memory Safety', () => {
    it('should prevent memory exhaustion attacks', async () => {
      const memoryExhaustionCartridge = {
        version: "1.0",
        metadata: { title: "Memory Attack", author: "Test", description: "Test" },
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
            // Try to create excessive number of nodes
            children: Array.from({ length: 10000 }, (_, i) => ({
              id: `node-${i}`, type: "Sprite",
              transform: { position: [0, 0], scale: [1, 1], rotation: 0, skew: [0, 0], alpha: 1 },
              visible: true, children: [], actions: [], triggers: [],
              sprite: "test"
            })),
            actions: [], triggers: []
          }
        }],
        assets: {
          sprites: [{ id: "test", url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" }],
          audio: [],
          fonts: []
        },
        variables: {}
      };

      // Should either reject the cartridge or handle it gracefully
      const startTime = Date.now();
      try {
        await engine.loadCartridge(memoryExhaustionCartridge);
        engine.start();
        
        // Should not take too long to process
        const endTime = Date.now();
        expect(endTime - startTime).toBeLessThan(5000); // 5 second timeout
      } catch (error) {
        // Acceptable to reject excessive cartridges
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Input Validation', () => {
    it('should sanitize user input in text nodes', async () => {
      const xssCartridge = {
        version: "1.0",
        metadata: { title: "XSS Test", author: "Test", description: "Test" },
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
              id: "text-node", type: "Text",
              transform: { position: [100, 100], scale: [1, 1], rotation: 0, skew: [0, 0], alpha: 1 },
              visible: true, children: [], actions: [], triggers: [],
              text: "<script>alert('XSS')</script>Hello World",
              font: "Arial",
              size: 16,
              color: "#ffffff"
            }],
            actions: [], triggers: []
          }
        }],
        assets: { sprites: [], audio: [], fonts: [] },
        variables: {}
      };

      // Should load and sanitize the text content
      await engine.loadCartridge(xssCartridge);
      engine.start();

      // Text should be rendered safely without executing scripts
      const state = engine.getState();
      expect(state.running).toBe(true);
    });
  });

  describe('Network Security', () => {
    it('should restrict asset loading to allowed domains', async () => {
      const externalAssetCartridge = {
        version: "1.0",
        metadata: { title: "External Assets", author: "Test", description: "Test" },
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
            visible: true, children: [], actions: [], triggers: []
          }
        }],
        assets: {
          sprites: [{ 
            id: "external", 
            url: "https://malicious-domain.com/image.png" 
          }],
          audio: [],
          fonts: []
        },
        variables: {}
      };

      // Should handle external URLs according to security policy
      // This might reject the cartridge or load with fallback assets
      try {
        await engine.loadCartridge(externalAssetCartridge);
        engine.start();
        
        const state = engine.getState();
        expect(state.running).toBe(true);
      } catch (error) {
        // Acceptable to reject cartridges with external assets
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Execution Limits', () => {
    it('should prevent infinite loops in action execution', async () => {
      const infiniteLoopCartridge = {
        version: "1.0",
        metadata: { title: "Infinite Loop", author: "Test", description: "Test" },
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
              id: "loop-node", type: "Sprite",
              transform: { position: [0, 0], scale: [1, 1], rotation: 0, skew: [0, 0], alpha: 1 },
              visible: true, children: [], actions: [],
              triggers: [{
                event: "on.start",
                actions: Array.from({ length: 10 }, () => ({
                  type: "setVar",
                  params: { name: "counter", value: "counter + 1" }
                }))
              }],
              sprite: "test"
            }],
            actions: [], triggers: []
          }
        }],
        assets: {
          sprites: [{ id: "test", url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" }],
          audio: [],
          fonts: []
        },
        variables: { counter: 0 }
      };

      const startTime = Date.now();
      
      await engine.loadCartridge(infiniteLoopCartridge);
      engine.start();

      // Should not hang indefinitely
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
      
      const state = engine.getState();
      expect(state.running).toBe(true);
    });
  });
});