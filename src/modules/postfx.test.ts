/**
 * Unit tests for post-processing effects module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PostFXRenderer,
  PostFXRenderModule,
  FramebufferManager,
  VignetteEffect,
  BloomLiteEffect,
  ColorGradingEffect,
  PostChainNode,
  PostFXModuleDefinition
} from './postfx.js';
import { RenderContext } from '../types/modules.js';
import { Node } from '../types/core.js';

// Mock canvas and context
const createMockCanvas = (width = 100, height = 100) => {
  const canvas = {
    width,
    height,
    getContext: vi.fn(() => mockContext)
  } as unknown as HTMLCanvasElement;
  
  let globalCompositeOperation = 'source-over';
  let globalAlpha = 1;
  
  const mockContext = {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    createImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height
    })),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height
    })),
    putImageData: vi.fn(),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn()
    })),
    fillRect: vi.fn(),
    get globalCompositeOperation() { return globalCompositeOperation; },
    set globalCompositeOperation(value) { globalCompositeOperation = value; },
    get globalAlpha() { return globalAlpha; },
    set globalAlpha(value) { globalAlpha = value; },
    fillStyle: '#000000'
  } as unknown as CanvasRenderingContext2D;

  canvas.getContext = vi.fn(() => mockContext);
  return { canvas, context: mockContext };
};

// Mock document.createElement for canvas creation
global.document = {
  createElement: vi.fn((tagName: string) => {
    if (tagName === 'canvas') {
      return createMockCanvas().canvas;
    }
    return null;
  })
} as unknown as Document;

describe('PostFXRenderer', () => {
  let renderer: PostFXRenderer;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    renderer = new PostFXRenderer();
    const mock = createMockCanvas();
    mockCanvas = mock.canvas;
    mockContext = mock.context;
  });

  afterEach(() => {
    renderer.cleanup();
  });

  describe('applyVignette', () => {
    it('should apply vignette effect when enabled', () => {
      const effect: VignetteEffect = {
        type: 'vignette',
        enabled: true,
        intensity: 0.5,
        radius: 0.3,
        softness: 0.7,
        color: '#000000'
      };

      renderer.applyVignette(mockCanvas, mockContext, effect);

      expect(mockContext.drawImage).toHaveBeenCalledWith(mockCanvas, 0, 0);
      expect(mockContext.createRadialGradient).toHaveBeenCalled();
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    it('should skip effect when disabled', () => {
      const effect: VignetteEffect = {
        type: 'vignette',
        enabled: false,
        intensity: 0.5,
        radius: 0.3,
        softness: 0.7,
        color: '#000000'
      };

      renderer.applyVignette(mockCanvas, mockContext, effect);

      expect(mockContext.drawImage).toHaveBeenCalledWith(mockCanvas, 0, 0);
      expect(mockContext.createRadialGradient).not.toHaveBeenCalled();
    });

    it('should skip effect when intensity is zero', () => {
      const effect: VignetteEffect = {
        type: 'vignette',
        enabled: true,
        intensity: 0,
        radius: 0.3,
        softness: 0.7,
        color: '#000000'
      };

      renderer.applyVignette(mockCanvas, mockContext, effect);

      expect(mockContext.drawImage).toHaveBeenCalledWith(mockCanvas, 0, 0);
      expect(mockContext.createRadialGradient).not.toHaveBeenCalled();
    });
  });

  describe('applyBloomLite', () => {
    it('should apply bloom effect when enabled', () => {
      const effect: BloomLiteEffect = {
        type: 'bloom-lite',
        enabled: true,
        intensity: 0.3,
        threshold: 0.8,
        radius: 4,
        strength: 1.5
      };

      renderer.applyBloomLite(mockCanvas, mockContext, effect);

      expect(mockContext.drawImage).toHaveBeenCalled();
      // The bloom effect should have been applied (we can't easily test the exact composite operation changes)
      expect(mockContext.getImageData).toHaveBeenCalled();
    });

    it('should skip effect when disabled', () => {
      const effect: BloomLiteEffect = {
        type: 'bloom-lite',
        enabled: false,
        intensity: 0.3,
        threshold: 0.8,
        radius: 4,
        strength: 1.5
      };

      renderer.applyBloomLite(mockCanvas, mockContext, effect);

      expect(mockContext.drawImage).toHaveBeenCalledWith(mockCanvas, 0, 0);
      expect(mockContext.globalCompositeOperation).toBe('source-over');
    });
  });

  describe('applyColorGrading', () => {
    it('should apply color grading when enabled', () => {
      const effect: ColorGradingEffect = {
        type: 'color-grading',
        enabled: true,
        intensity: 1.0,
        brightness: 0.1,
        contrast: 0.2,
        saturation: 0.1,
        hue: 10,
        gamma: 1.2
      };

      renderer.applyColorGrading(mockCanvas, mockContext, effect);

      expect(mockContext.drawImage).toHaveBeenCalledWith(mockCanvas, 0, 0);
      expect(mockContext.getImageData).toHaveBeenCalled();
      expect(mockContext.putImageData).toHaveBeenCalled();
    });

    it('should skip processing when disabled', () => {
      const effect: ColorGradingEffect = {
        type: 'color-grading',
        enabled: false,
        intensity: 1.0,
        brightness: 0.1,
        contrast: 0.2,
        saturation: 0.1,
        hue: 10,
        gamma: 1.2
      };

      renderer.applyColorGrading(mockCanvas, mockContext, effect);

      expect(mockContext.drawImage).toHaveBeenCalledWith(mockCanvas, 0, 0);
      expect(mockContext.getImageData).not.toHaveBeenCalled();
    });
  });
});

describe('FramebufferManager', () => {
  let manager: FramebufferManager;

  beforeEach(() => {
    manager = new FramebufferManager();
  });

  afterEach(() => {
    manager.cleanup();
  });

  it('should create framebuffer with correct dimensions', () => {
    const { canvas, ctx } = manager.getFramebuffer('test', 200, 150);

    expect(canvas.width).toBe(200);
    expect(canvas.height).toBe(150);
    expect(ctx).toBeDefined();
  });

  it('should reuse existing framebuffer with same dimensions', () => {
    const buffer1 = manager.getFramebuffer('test', 100, 100);
    const buffer2 = manager.getFramebuffer('test', 100, 100);

    expect(buffer1.canvas).toBe(buffer2.canvas);
    expect(buffer1.ctx).toBe(buffer2.ctx);
  });

  it('should recreate framebuffer when dimensions change', () => {
    const buffer1 = manager.getFramebuffer('test', 100, 100);
    const buffer2 = manager.getFramebuffer('test', 200, 200);

    expect(buffer1.canvas).not.toBe(buffer2.canvas);
    expect(buffer2.canvas.width).toBe(200);
    expect(buffer2.canvas.height).toBe(200);
  });

  it('should clear framebuffer', () => {
    const { ctx } = manager.getFramebuffer('test', 100, 100);
    const clearSpy = vi.spyOn(ctx, 'clearRect');

    manager.clearFramebuffer('test');

    expect(clearSpy).toHaveBeenCalledWith(0, 0, 100, 100);
  });

  it('should copy between framebuffers', () => {
    const source = manager.getFramebuffer('source', 100, 100);
    const target = manager.getFramebuffer('target', 100, 100);
    const drawImageSpy = vi.spyOn(target.ctx, 'drawImage');

    manager.copyFramebuffer('source', 'target');

    expect(drawImageSpy).toHaveBeenCalledWith(source.canvas, 0, 0);
  });
});

describe('PostFXRenderModule', () => {
  let module: PostFXRenderModule;
  let mockRenderContext: RenderContext;
  let mockNode: PostChainNode;

  beforeEach(() => {
    module = new PostFXRenderModule();
    
    const mock = createMockCanvas();
    mockRenderContext = {
      canvas: mock.canvas,
      ctx: mock.context,
      camera: { position: { x: 0, y: 0 }, zoom: 1, rotation: 0, target: { x: 0, y: 0 } },
      theme: {},
      interpolation: 0,
      viewport: { width: 100, height: 100, scale: 1, offset: { x: 0, y: 0 } }
    } as RenderContext;

    mockNode = {
      id: 'postchain1',
      type: 'PostChain',
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
      triggers: [],
      effects: [],
      addChild: vi.fn(),
      removeChild: vi.fn(),
      removeFromParent: vi.fn(),
      getRoot: vi.fn(),
      getDepth: vi.fn(),
      getWorldTransform: vi.fn(),
      isWorldVisible: vi.fn(() => true)
    } as PostChainNode;
  });

  afterEach(() => {
    module.cleanup();
  });

  it('should have correct module properties', () => {
    expect(module.name).toBe('postfx');
    expect(module.nodeTypes).toEqual(['PostChain']);
  });

  it('should skip rendering when no effects', () => {
    mockNode.effects = [];
    const drawImageSpy = vi.spyOn(mockRenderContext.ctx, 'drawImage');

    module.render(mockNode, mockRenderContext);

    expect(drawImageSpy).not.toHaveBeenCalled();
  });

  it('should render effects in sequence', () => {
    mockNode.effects = [
      PostFXRenderModule.createVignetteEffect({ intensity: 0.5 }),
      PostFXRenderModule.createBloomLiteEffect({ intensity: 0.3 })
    ];
    const drawImageSpy = vi.spyOn(mockRenderContext.ctx, 'drawImage');

    module.render(mockNode, mockRenderContext);

    // Should draw final result back to main canvas
    expect(drawImageSpy).toHaveBeenCalled();
  });

  it('should skip disabled effects', () => {
    mockNode.effects = [
      { ...PostFXRenderModule.createVignetteEffect(), enabled: false },
      PostFXRenderModule.createBloomLiteEffect({ intensity: 0.3 })
    ];

    // Should not throw and should process enabled effects
    expect(() => module.render(mockNode, mockRenderContext)).not.toThrow();
  });
});

describe('PostFX Effect Factories', () => {
  it('should create vignette effect with defaults', () => {
    const effect = PostFXRenderModule.createVignetteEffect();

    expect(effect.type).toBe('vignette');
    expect(effect.enabled).toBe(true);
    expect(effect.intensity).toBe(0.5);
    expect(effect.radius).toBe(0.3);
    expect(effect.softness).toBe(0.7);
    expect(effect.color).toBe('#000000');
  });

  it('should create vignette effect with custom parameters', () => {
    const effect = PostFXRenderModule.createVignetteEffect({
      intensity: 0.8,
      color: '#FF0000'
    });

    expect(effect.intensity).toBe(0.8);
    expect(effect.color).toBe('#FF0000');
    expect(effect.radius).toBe(0.3); // Should keep default
  });

  it('should create bloom effect with defaults', () => {
    const effect = PostFXRenderModule.createBloomLiteEffect();

    expect(effect.type).toBe('bloom-lite');
    expect(effect.enabled).toBe(true);
    expect(effect.intensity).toBe(0.3);
    expect(effect.threshold).toBe(0.8);
    expect(effect.radius).toBe(4);
    expect(effect.strength).toBe(1.5);
  });

  it('should create color grading effect with defaults', () => {
    const effect = PostFXRenderModule.createColorGradingEffect();

    expect(effect.type).toBe('color-grading');
    expect(effect.enabled).toBe(true);
    expect(effect.intensity).toBe(1.0);
    expect(effect.brightness).toBe(0);
    expect(effect.contrast).toBe(0);
    expect(effect.saturation).toBe(0);
    expect(effect.hue).toBe(0);
    expect(effect.gamma).toBe(1.0);
  });
});

describe('PostFXModuleDefinition', () => {
  it('should have correct module definition', () => {
    expect(PostFXModuleDefinition.name).toBe('postfx');
    expect(PostFXModuleDefinition.nodeTypes).toEqual(['PostChain']);
    expect(PostFXModuleDefinition.actions).toEqual([
      'setPostFX', 'tweenPostFX', 'enablePostFX', 'disablePostFX'
    ]);
    expect(PostFXModuleDefinition.triggers).toEqual([]);
    expect(PostFXModuleDefinition.dependencies).toEqual([]);
    expect(PostFXModuleDefinition.size).toBe(12);
  });
});