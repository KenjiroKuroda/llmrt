/**
 * Integration tests for Mode-7 module with the core renderer
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerMode7Module } from './mode7.js';
import { Renderer } from '../core/renderer.js';
import { ModuleRegistry } from '../core/module-registry.js';
import { Node } from '../types/core.js';

describe('Mode-7 Integration', () => {
  let canvas: HTMLCanvasElement;
  let renderer: Renderer;
  let mockContext: CanvasRenderingContext2D;

  const testTheme = {
    colors: {
      primary: '#FF6B35',
      secondary: '#004E89',
      background: '#87CEEB',
      text: '#FFFFFF',
      accent: '#FFD23F'
    },
    font: {
      family: 'Arial, sans-serif',
      sizes: { small: 12, medium: 16, large: 24, xlarge: 32 }
    },
    spacing: { small: 4, medium: 8, large: 16, xlarge: 32 },
    radii: { small: 4, medium: 8, large: 16 }
  };

  beforeEach(() => {
    // Clear module registry
    const registry = ModuleRegistry.getInstance();
    (registry as any).modules.clear();
    (registry as any).renderModules.clear();
    (registry as any).actionHandlers.clear();

    // Create mock canvas and context
    mockContext = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      createLinearGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn()
      }),
      createImageData: vi.fn().mockReturnValue({
        data: new Uint8ClampedArray(800 * 300 * 4),
        width: 800,
        height: 300
      }),
      getImageData: vi.fn().mockReturnValue({
        data: new Uint8ClampedArray(256 * 256 * 4),
        width: 256,
        height: 256
      }),
      putImageData: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      transform: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      globalAlpha: 1,
      font: '',
      textAlign: 'start' as CanvasTextAlign,
      textBaseline: 'alphabetic' as CanvasTextBaseline,
      fillText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 100 }),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn()
    } as any;

    canvas = {
      width: 800,
      height: 600,
      getContext: vi.fn().mockReturnValue(mockContext),
      style: {},
      parentElement: {
        getBoundingClientRect: vi.fn().mockReturnValue({
          width: 800,
          height: 600
        })
      }
    } as any;

    // Register Mode-7 module
    registerMode7Module();

    // Create renderer
    renderer = new Renderer(canvas, testTheme);
  });

  it('should register Mode-7 module successfully', () => {
    const registry = ModuleRegistry.getInstance();
    
    expect(registry.supportsNodeType('Mode7Plane')).toBe(true);
    expect(registry.getModule('mode7')).toBeDefined();
    expect(registry.getRenderModule('mode7')).toBeDefined();
  });

  it('should render Mode-7 plane node', () => {
    const mode7Node: Node = {
      id: 'test-mode7',
      type: 'Mode7Plane',
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
      // Mode-7 specific properties
      texture: 'test-texture',
      horizon: 0.5,
      scale: 1.0,
      offset: { x: 0, y: 0 },
      textureWidth: 256,
      textureHeight: 256,
      // Required Node methods
      addChild: vi.fn(),
      removeChild: vi.fn(),
      removeFromParent: vi.fn(),
      getRoot: vi.fn().mockReturnValue(this),
      getDepth: vi.fn().mockReturnValue(0),
      getWorldTransform: vi.fn().mockReturnValue({
        position: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        skew: { x: 0, y: 0 },
        alpha: 1
      }),
      isWorldVisible: vi.fn().mockReturnValue(true)
    } as any;

    // Render the scene
    renderer.render([mode7Node], 0);

    // Verify rendering calls were made
    expect(mockContext.clearRect).toHaveBeenCalled();
    expect(mockContext.fillRect).toHaveBeenCalled(); // Background fill
    expect(mockContext.save).toHaveBeenCalled();
    expect(mockContext.restore).toHaveBeenCalled();
  });

  it('should handle Mode-7 plane with placeholder rendering', () => {
    const mode7Node: Node = {
      id: 'test-mode7-placeholder',
      type: 'Mode7Plane',
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
      // Mode-7 specific properties
      texture: 'missing-texture',
      horizon: 0.3,
      scale: 2.0,
      offset: { x: 10, y: 20 },
      // Required Node methods
      addChild: vi.fn(),
      removeChild: vi.fn(),
      removeFromParent: vi.fn(),
      getRoot: vi.fn().mockReturnValue(this),
      getDepth: vi.fn().mockReturnValue(0),
      getWorldTransform: vi.fn().mockReturnValue({
        position: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        skew: { x: 0, y: 0 },
        alpha: 1
      }),
      isWorldVisible: vi.fn().mockReturnValue(true)
    } as any;

    // Render the scene
    renderer.render([mode7Node], 0);

    // Verify placeholder rendering
    expect(mockContext.createLinearGradient).toHaveBeenCalled();
    expect(mockContext.stroke).toHaveBeenCalled(); // Horizon line
  });

  it('should support Mode-7 action handlers', () => {
    const registry = ModuleRegistry.getInstance();
    
    const setHandler = registry.getActionHandler('setMode7Camera');
    const moveHandler = registry.getActionHandler('moveMode7Camera');
    
    expect(setHandler).toBeDefined();
    expect(moveHandler).toBeDefined();
    
    // Test that handlers don't throw
    expect(() => setHandler!({ position: { x: 100, y: 200 } })).not.toThrow();
    expect(() => moveHandler!({ delta: { x: 10, y: 5 } })).not.toThrow();
  });

  it('should handle complex scene with Mode-7 and other nodes', () => {
    const sceneNodes: Node[] = [
      // Regular sprite node
      {
        id: 'sprite',
        type: 'Sprite',
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
        spriteId: 'test-sprite',
        addChild: vi.fn(),
        removeChild: vi.fn(),
        removeFromParent: vi.fn(),
        getRoot: vi.fn().mockReturnValue(this),
        getDepth: vi.fn().mockReturnValue(0),
        getWorldTransform: vi.fn().mockReturnValue({
          position: { x: 100, y: 100 },
          scale: { x: 1, y: 1 },
          rotation: 0,
          skew: { x: 0, y: 0 },
          alpha: 1
        }),
        isWorldVisible: vi.fn().mockReturnValue(true)
      },
      // Mode-7 plane node
      {
        id: 'mode7-ground',
        type: 'Mode7Plane',
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
        texture: 'ground-texture',
        horizon: 0.4,
        scale: 1.5,
        offset: { x: 0, y: 0 },
        addChild: vi.fn(),
        removeChild: vi.fn(),
        removeFromParent: vi.fn(),
        getRoot: vi.fn().mockReturnValue(this),
        getDepth: vi.fn().mockReturnValue(0),
        getWorldTransform: vi.fn().mockReturnValue({
          position: { x: 0, y: 0 },
          scale: { x: 1, y: 1 },
          rotation: 0,
          skew: { x: 0, y: 0 },
          alpha: 1
        }),
        isWorldVisible: vi.fn().mockReturnValue(true)
      }
    ] as any;

    // Render the complex scene
    renderer.render(sceneNodes, 0.5);

    // Verify both nodes were processed
    expect(mockContext.save).toHaveBeenCalledTimes(3); // Background + 2 nodes
    expect(mockContext.restore).toHaveBeenCalledTimes(3);
  });
});