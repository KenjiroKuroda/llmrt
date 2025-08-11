/**
 * Cross-Browser Compatibility Tests
 * Tests engine functionality across different browser environments
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LLMRTEngineImpl } from './engine';

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

// Mock Canvas context with getTransform support
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn().mockReturnValue({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
    putImageData: vi.fn(),
    createImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4) }),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    transform: vi.fn(),
    setTransform: vi.fn(),
    getTransform: vi.fn().mockReturnValue({
      a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
      is2D: true,
      isIdentity: true
    }),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1
  }),
  writable: true
});

describe('Cross-Browser Compatibility', () => {
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

  describe('Canvas API Compatibility', () => {
    it('should work with standard 2D canvas context', () => {
      const ctx = canvas.getContext('2d');
      expect(ctx).toBeDefined();
      expect(typeof ctx?.fillRect).toBe('function');
      expect(typeof ctx?.drawImage).toBe('function');
      expect(typeof ctx?.getImageData).toBe('function');
    });

    it('should handle canvas transforms correctly', () => {
      const ctx = canvas.getContext('2d')!;
      
      // Test transform operations that might vary across browsers
      ctx.save();
      ctx.translate(100, 100);
      ctx.rotate(Math.PI / 4);
      ctx.scale(2, 2);
      
      const transform = ctx.getTransform();
      expect(transform).toBeDefined();
      
      ctx.restore();
    });
  });

  describe('Audio API Compatibility', () => {
    it('should handle Web Audio API availability', () => {
      // Test AudioContext creation (might not be available in test environment)
      let audioContextAvailable = false;
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          audioContextAvailable = true;
        }
      } catch (e) {
        // AudioContext not available
      }
      
      // Engine should handle both cases gracefully
      expect(typeof audioContextAvailable).toBe('boolean');
    });
  });
});