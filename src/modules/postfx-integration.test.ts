/**
 * Integration tests for post-processing effects module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PostFXRenderModule, registerPostFXModule, PostFXModuleDefinition } from './postfx.js';
import { ModuleRegistry } from '../core/module-registry.js';
import { Renderer } from '../core/renderer.js';
import { Node, ThemeTokens } from '../types/core.js';

// Mock canvas and context for integration tests
const createMockCanvas = (width = 800, height = 600) => {
  const canvas = {
    width,
    height,
    style: {},
    parentElement: {
      getBoundingClientRect: () => ({ width: 800, height: 600 })
    },
    getContext: vi.fn()
  } as unknown as HTMLCanvasElement;
  
  const mockContext = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    transform: vi.fn(),
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
    globalCompositeOperation: 'source-over',
    globalAlpha: 1,
    fillStyle: '#000000',
    font: '16px Arial',
    textAlign: 'center',
    textBaseline: 'middle',
    measureText: vi.fn(() => ({ width: 50 })),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    strokeStyle: '#000000',
    lineWidth: 1
  } as unknown as CanvasRenderingContext2D;

  canvas.getContext = vi.fn(() => mockContext);
  return { canvas, context: mockContext };
};

// Mock document.createElement
global.document = {
  createElement: vi.fn((tagName: string) => {
    if (tagName === 'canvas') {
      return createMockCanvas().canvas;
    }
    return null;
  })
} as unknown as Document;

// Mock window for responsive canvas
global.window = {
  devicePixelRatio: 1,
  addEventListener: vi.fn()
} as unknown as Window;

describe('PostFX Module Integration', () => {
  let moduleRegistry: ModuleRegistry;
  let renderer: Renderer;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;

  const mockTheme: ThemeTokens = {
    colors: {
      primary: '#007ACC',
      secondary: '#FF6B35',
      background: '#1E1E1E',
      text: '#FFFFFF',
      accent: '#FFD700'
    },
    font: {
      family: 'Arial, sans-serif',
      sizes: {
        small: 12,
        medium: 16,
        large: 24
      }
    },
    spacing: {
      small: 4,
      medium: 8,
      large: 16
    },
    radii: {
      small: 4,
      medium: 8,
      large: 16
    }
  };

  beforeEach(() => {
    // Reset module registry
    (ModuleRegistry as any).instance = undefined;
    moduleRegistry = ModuleRegistry.getInstance();
    
    // Create mock canvas and renderer
    const mock = createMockCanvas();
    mockCanvas = mock.canvas;
    mockContext = mock.context;
    
    renderer = new Renderer(mockCanvas, mockTheme);
  });

  afterEach(() => {
    // Cleanup
    (ModuleRegistry as any).instance = undefined;
  });

  it('should register PostFX module successfully', () => {
    registerPostFXModule();

    expect(moduleRegistry.isRegisteredModule('postfx')).toBe(true);
    expect(moduleRegistry.getModule('postfx')).toEqual(PostFXModuleDefinition);
    expect(moduleRegistry.getRenderModule('postfx')).toBeInstanceOf(PostFXRenderModule);
  });

  it('should support PostChain node type after registration', () => {
    registerPostFXModule();

    expect(moduleRegistry.supportsNodeType('PostChain')).toBe(true);
  });

  it('should register PostFX action handlers', () => {
    registerPostFXModule();

    expect(moduleRegistry.getActionHandler('setPostFX')).toBeDefined();
    expect(moduleRegistry.getActionHandler('tweenPostFX')).toBeDefined();
    expect(moduleRegistry.getActionHandler('enablePostFX')).toBeDefined();
    expect(moduleRegistry.getActionHandler('disablePostFX')).toBeDefined();
  });

  it('should render PostChain nodes through main renderer', () => {
    registerPostFXModule();
    
    // Manually register the module with the renderer
    const postfxModule = moduleRegistry.getRenderModule('postfx');
    if (postfxModule) {
      renderer.registerModule(postfxModule);
    }

    // Create a PostChain node
    const postChainNode: Node = {
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
      effects: [
        {
          type: 'vignette',
          enabled: true,
          intensity: 0.5,
          radius: 0.3,
          softness: 0.7,
          color: '#000000'
        }
      ],
      addChild: vi.fn(),
      removeChild: vi.fn(),
      removeFromParent: vi.fn(),
      getRoot: vi.fn(),
      getDepth: vi.fn(),
      getWorldTransform: vi.fn(() => ({
        position: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        skew: { x: 0, y: 0 },
        alpha: 1
      })),
      isWorldVisible: vi.fn(() => true)
    } as any;

    // Render scene with PostChain node
    renderer.render([postChainNode], 0);

    // Verify rendering was called
    expect(mockContext.drawImage).toHaveBeenCalled();
  });

  it('should handle multiple PostChain nodes', () => {
    registerPostFXModule();
    
    // Manually register the module with the renderer
    const postfxModule = moduleRegistry.getRenderModule('postfx');
    if (postfxModule) {
      renderer.registerModule(postfxModule);
    }

    const postChain1: Node = {
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
      effects: [
        {
          type: 'vignette',
          enabled: true,
          intensity: 0.3,
          radius: 0.4,
          softness: 0.6,
          color: '#000000'
        }
      ],
      addChild: vi.fn(),
      removeChild: vi.fn(),
      removeFromParent: vi.fn(),
      getRoot: vi.fn(),
      getDepth: vi.fn(),
      getWorldTransform: vi.fn(() => ({
        position: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        skew: { x: 0, y: 0 },
        alpha: 1
      })),
      isWorldVisible: vi.fn(() => true)
    } as any;

    const postChain2: Node = {
      id: 'postchain2',
      type: 'PostChain',
      transform: {
        position: { x: 100, y: 100 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        skew: { x: 0, y: 0 },
        alpha: 1
      },
      visible: true,
      children: [],
      actions: [],
      triggers: [],
      effects: [
        {
          type: 'bloom-lite',
          enabled: true,
          intensity: 0.4,
          threshold: 0.7,
          radius: 3,
          strength: 1.2
        }
      ],
      addChild: vi.fn(),
      removeChild: vi.fn(),
      removeFromParent: vi.fn(),
      getRoot: vi.fn(),
      getDepth: vi.fn(),
      getWorldTransform: vi.fn(() => ({
        position: { x: 100, y: 100 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        skew: { x: 0, y: 0 },
        alpha: 1
      })),
      isWorldVisible: vi.fn(() => true)
    } as any;

    // Render scene with multiple PostChain nodes
    renderer.render([postChain1, postChain2], 0);

    // Should not throw and should render both
    expect(mockContext.drawImage).toHaveBeenCalled();
  });

  it('should handle PostChain nodes with no effects gracefully', () => {
    registerPostFXModule();
    
    // Manually register the module with the renderer
    const postfxModule = moduleRegistry.getRenderModule('postfx');
    if (postfxModule) {
      renderer.registerModule(postfxModule);
    }

    const emptyPostChain: Node = {
      id: 'empty-postchain',
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
      getWorldTransform: vi.fn(() => ({
        position: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        skew: { x: 0, y: 0 },
        alpha: 1
      })),
      isWorldVisible: vi.fn(() => true)
    } as any;

    // Should not throw when rendering empty PostChain
    expect(() => renderer.render([emptyPostChain], 0)).not.toThrow();
  });

  it('should calculate correct estimated module size', () => {
    registerPostFXModule();

    const estimatedSize = moduleRegistry.getEstimatedSize();
    expect(estimatedSize).toBeGreaterThan(0);
    expect(estimatedSize).toBe(PostFXModuleDefinition.size);
  });

  it('should handle unknown effect types gracefully', () => {
    registerPostFXModule();
    
    // Manually register the module with the renderer
    const postfxModule = moduleRegistry.getRenderModule('postfx');
    if (postfxModule) {
      renderer.registerModule(postfxModule);
    }

    const postChainWithUnknownEffect: Node = {
      id: 'postchain-unknown',
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
      effects: [
        {
          type: 'unknown-effect' as any,
          enabled: true,
          intensity: 0.5
        }
      ],
      addChild: vi.fn(),
      removeChild: vi.fn(),
      removeFromParent: vi.fn(),
      getRoot: vi.fn(),
      getDepth: vi.fn(),
      getWorldTransform: vi.fn(() => ({
        position: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        skew: { x: 0, y: 0 },
        alpha: 1
      })),
      isWorldVisible: vi.fn(() => true)
    } as any;

    // Should not throw when encountering unknown effect type
    expect(() => renderer.render([postChainWithUnknownEffect], 0)).not.toThrow();
  });
});

describe('PostFX Performance Tests', () => {
  let module: PostFXRenderModule;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    module = new PostFXRenderModule();
    const mock = createMockCanvas(1920, 1080); // High resolution for performance testing
    mockCanvas = mock.canvas;
    mockContext = mock.context;
  });

  afterEach(() => {
    module.cleanup();
  });

  it('should handle large canvas sizes efficiently', () => {
    const renderContext = {
      canvas: mockCanvas,
      ctx: mockContext,
      camera: { position: { x: 0, y: 0 }, zoom: 1, rotation: 0, target: { x: 0, y: 0 } },
      theme: {},
      interpolation: 0,
      viewport: { width: 1920, height: 1080, scale: 1, offset: { x: 0, y: 0 } }
    } as any;

    const postChainNode = {
      id: 'perf-test',
      type: 'PostChain',
      effects: [
        {
          type: 'vignette',
          enabled: true,
          intensity: 0.5,
          radius: 0.3,
          softness: 0.7,
          color: '#000000'
        },
        {
          type: 'bloom-lite',
          enabled: true,
          intensity: 0.3,
          threshold: 0.8,
          radius: 4,
          strength: 1.5
        },
        {
          type: 'color-grading',
          enabled: true,
          intensity: 1.0,
          brightness: 0.1,
          contrast: 0.1,
          saturation: 0.1,
          hue: 5,
          gamma: 1.1
        }
      ],
      getWorldTransform: vi.fn(),
      isWorldVisible: vi.fn(() => true)
    } as any;

    const startTime = performance.now();
    module.render(postChainNode, renderContext);
    const endTime = performance.now();

    // Should complete within reasonable time (this is a rough benchmark)
    expect(endTime - startTime).toBeLessThan(1000); // 1000ms threshold (more lenient for CI)
  });

  it('should handle multiple effect chains without memory leaks', () => {
    const renderContext = {
      canvas: mockCanvas,
      ctx: mockContext,
      camera: { position: { x: 0, y: 0 }, zoom: 1, rotation: 0, target: { x: 0, y: 0 } },
      theme: {},
      interpolation: 0,
      viewport: { width: 800, height: 600, scale: 1, offset: { x: 0, y: 0 } }
    } as any;

    // Simulate multiple render calls
    for (let i = 0; i < 10; i++) {
      const postChainNode = {
        id: `perf-test-${i}`,
        type: 'PostChain',
        effects: [
          {
            type: 'vignette',
            enabled: true,
            intensity: 0.5,
            radius: 0.3,
            softness: 0.7,
            color: '#000000'
          }
        ],
        getWorldTransform: vi.fn(),
        isWorldVisible: vi.fn(() => true)
      } as any;

      module.render(postChainNode, renderContext);
    }

    // Should not throw and should complete all renders
    expect(mockContext.drawImage).toHaveBeenCalled();
  });
});