/**
 * Basic tests for the core engine setup
 */

import { describe, it, expect, vi } from 'vitest';
import { LLMRTEngineImpl } from './engine.js';
import { LGFCartridge } from '../types/core.js';

// Mock window.matchMedia
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

describe('LLMRTEngine', () => {
  it('should create an engine instance', () => {
    const engine = new LLMRTEngineImpl();
    expect(engine).toBeDefined();
    expect(engine.getState().running).toBe(false);
  });

  it('should load a valid cartridge', async () => {
    const engine = new LLMRTEngineImpl();
    
    const cartridge: LGFCartridge = {
      version: '1.0',
      metadata: {
        title: 'Test Game',
        author: 'Test Author',
        description: 'A test game'
      },
      theme: {
        colors: {
          primary: '#000000',
          secondary: '#ffffff',
          background: '#cccccc',
          text: '#000000',
          accent: '#ff0000'
        },
        font: {
          family: 'Arial',
          sizes: { small: 12, medium: 16, large: 24 }
        },
        spacing: { small: 4, medium: 8, large: 16 },
        radii: { small: 2, medium: 4, large: 8 }
      },
      scenes: [{
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
      }],
      assets: {
        sprites: [],
        audio: [],
        fonts: []
      }
    };

    await expect(engine.loadCartridge(cartridge)).resolves.not.toThrow();
    expect(engine.getState().currentScene).toBe('main');
  });

  it('should reject invalid cartridge', async () => {
    const engine = new LLMRTEngineImpl();
    
    const invalidCartridge = {
      // Missing required fields
    } as any;

    await expect(engine.loadCartridge(invalidCartridge)).rejects.toThrow('Cartridge validation failed');
  });

  it('should start and stop engine', async () => {
    const engine = new LLMRTEngineImpl();
    
    const cartridge: LGFCartridge = {
      version: '1.0',
      metadata: { title: 'Test', author: 'Test', description: 'Test' },
      theme: {
        colors: { primary: '#000', secondary: '#fff', background: '#ccc', text: '#000', accent: '#f00' },
        font: { family: 'Arial', sizes: { medium: 16 } },
        spacing: { medium: 8 },
        radii: { medium: 4 }
      },
      scenes: [{
        id: 'main',
        root: {
          id: 'root', type: 'Group',
          transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0, skew: { x: 0, y: 0 }, alpha: 1 },
          visible: true, children: [], actions: [], triggers: []
        }
      }],
      assets: { sprites: [], audio: [], fonts: [] }
    };

    await engine.loadCartridge(cartridge);
    
    engine.start();
    expect(engine.getState().running).toBe(true);
    expect(engine.getState().paused).toBe(false);
    
    engine.pause();
    expect(engine.getState().paused).toBe(true);
    
    engine.resume();
    expect(engine.getState().paused).toBe(false);
    
    engine.stop();
    expect(engine.getState().running).toBe(false);
  });
});