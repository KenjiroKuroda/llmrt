/**
 * Tests for Mode-7 rendering module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Mode7Math, Mode7RenderModule, Mode7ModuleDefinition, registerMode7Module } from './mode7.js';
import { ModuleRegistry } from '../core/module-registry.js';
import { RenderContext } from '../types/modules.js';

describe('Mode7Math', () => {
  describe('screenToWorld', () => {
    it('should transform screen coordinates to world coordinates', () => {
      const camera = Mode7Math.createDefaultCamera();
      const viewport = { width: 800, height: 600, horizon: 0.5 };
      
      // Test center of screen at horizon
      const worldPos = Mode7Math.screenToWorld(400, 300, camera, viewport);
      expect(worldPos.x).toBeCloseTo(0, 1);
      expect(worldPos.y).toBeCloseTo(0, 1);
    });

    it('should handle points at different distances', () => {
      const camera = Mode7Math.createDefaultCamera();
      const viewport = { width: 800, height: 600, horizon: 0.5 };
      
      // Test point below horizon (closer to horizon)
      const closePos = Mode7Math.screenToWorld(400, 400, camera, viewport);
      
      // Test point further below horizon (farther from horizon)
      const farPos = Mode7Math.screenToWorld(400, 500, camera, viewport);
      
      // In Mode-7, points closer to the horizon line are farther away
      // Points farther from horizon line are closer to camera
      expect(Math.abs(closePos.y)).toBeGreaterThan(Math.abs(farPos.y));
    });

    it('should handle camera rotation', () => {
      const camera = Mode7Math.createDefaultCamera();
      camera.rotation = Math.PI / 4; // 45 degrees
      const viewport = { width: 800, height: 600, horizon: 0.5 };
      
      const worldPos = Mode7Math.screenToWorld(500, 400, camera, viewport);
      
      // With rotation, the world position should be rotated
      expect(worldPos.x).not.toBeCloseTo(0, 1);
      expect(worldPos.y).not.toBeCloseTo(0, 1);
    });

    it('should handle different camera heights', () => {
      const lowCamera = Mode7Math.createDefaultCamera();
      lowCamera.height = 50;
      
      const highCamera = Mode7Math.createDefaultCamera();
      highCamera.height = 200;
      
      const viewport = { width: 800, height: 600, horizon: 0.5 };
      
      const lowPos = Mode7Math.screenToWorld(400, 400, lowCamera, viewport);
      const highPos = Mode7Math.screenToWorld(400, 400, highCamera, viewport);
      
      // Higher camera should see farther
      expect(Math.abs(highPos.y)).toBeGreaterThan(Math.abs(lowPos.y));
    });
  });

  describe('worldToScreen', () => {
    it('should transform world coordinates to screen coordinates', () => {
      const camera = Mode7Math.createDefaultCamera();
      const viewport = { width: 800, height: 600, horizon: 0.5 };
      
      // Test point in front of camera
      const screenPos = Mode7Math.worldToScreen(0, 100, camera, viewport);
      expect(screenPos.x).toBeCloseTo(400, 1); // Center X
      expect(screenPos.y).toBeGreaterThan(300); // Below horizon
    });

    it('should handle points behind camera', () => {
      const camera = Mode7Math.createDefaultCamera();
      const viewport = { width: 800, height: 600, horizon: 0.5 };
      
      // Point behind camera
      const screenPos = Mode7Math.worldToScreen(0, -10, camera, viewport);
      expect(screenPos.x).toBe(-1); // Off-screen marker
      expect(screenPos.y).toBe(-1); // Off-screen marker
    });

    it('should be consistent with screenToWorld', () => {
      const camera = Mode7Math.createDefaultCamera();
      const viewport = { width: 800, height: 600, horizon: 0.5 };
      
      // Test round-trip conversion
      const originalScreen = { x: 500, y: 400 };
      const worldPos = Mode7Math.screenToWorld(originalScreen.x, originalScreen.y, camera, viewport);
      const backToScreen = Mode7Math.worldToScreen(worldPos.x, worldPos.y, camera, viewport);
      
      expect(backToScreen.x).toBeCloseTo(originalScreen.x, 1);
      expect(backToScreen.y).toBeCloseTo(originalScreen.y, 1);
    });
  });

  describe('getTextureCoordinates', () => {
    it('should calculate texture coordinates correctly', () => {
      const worldPos = { x: 100, y: 200 };
      const textureSize = { x: 256, y: 256 };
      const scale = 1.0;
      const offset = { x: 0, y: 0 };
      
      const texCoords = Mode7Math.getTextureCoordinates(worldPos, textureSize, scale, offset);
      
      expect(texCoords.x).toBe(100);
      expect(texCoords.y).toBe(200);
    });

    it('should handle texture wrapping', () => {
      const worldPos = { x: 300, y: 400 };
      const textureSize = { x: 256, y: 256 };
      const scale = 1.0;
      const offset = { x: 0, y: 0 };
      
      const texCoords = Mode7Math.getTextureCoordinates(worldPos, textureSize, scale, offset);
      
      expect(texCoords.x).toBe(44); // 300 % 256
      expect(texCoords.y).toBe(144); // 400 % 256
    });

    it('should handle negative coordinates', () => {
      const worldPos = { x: -50, y: -100 };
      const textureSize = { x: 256, y: 256 };
      const scale = 1.0;
      const offset = { x: 0, y: 0 };
      
      const texCoords = Mode7Math.getTextureCoordinates(worldPos, textureSize, scale, offset);
      
      expect(texCoords.x).toBe(206); // -50 % 256 + 256
      expect(texCoords.y).toBe(156); // -100 % 256 + 256
    });

    it('should apply scale and offset', () => {
      const worldPos = { x: 100, y: 100 };
      const textureSize = { x: 256, y: 256 };
      const scale = 2.0;
      const offset = { x: 50, y: 25 };
      
      const texCoords = Mode7Math.getTextureCoordinates(worldPos, textureSize, scale, offset);
      
      expect(texCoords.x).toBe(250); // (100 * 2 + 50) % 256
      expect(texCoords.y).toBe(225); // (100 * 2 + 25) % 256
    });
  });

  describe('createDefaultCamera', () => {
    it('should create a camera with sensible defaults', () => {
      const camera = Mode7Math.createDefaultCamera();
      
      expect(camera.position.x).toBe(0);
      expect(camera.position.y).toBe(0);
      expect(camera.rotation).toBe(0);
      expect(camera.height).toBe(100);
      expect(camera.pitch).toBeCloseTo(Math.PI / 6, 3); // 30 degrees
      expect(camera.fov).toBeCloseTo(Math.PI / 3, 3);   // 60 degrees
    });
  });
});

describe('Mode7RenderModule', () => {
  let renderModule: Mode7RenderModule;
  let mockContext: RenderContext;
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    renderModule = new Mode7RenderModule();
    
    // Create mock canvas and context
    mockCanvas = {
      width: 800,
      height: 600,
      getContext: vi.fn()
    } as any;

    mockCtx = {
      createImageData: vi.fn().mockReturnValue({
        data: new Uint8ClampedArray(800 * 300 * 4),
        width: 800,
        height: 300
      }),
      putImageData: vi.fn(),
      createLinearGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn()
      }),
      fillRect: vi.fn(),
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 0,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn()
    } as any;

    mockContext = {
      canvas: mockCanvas,
      ctx: mockCtx,
      camera: { position: { x: 0, y: 0 }, zoom: 1, rotation: 0, target: { x: 0, y: 0 } },
      theme: {
        colors: { primary: '#000', secondary: '#fff', background: '#ccc', text: '#000', accent: '#f00' },
        font: { family: 'Arial', sizes: { medium: 16 } },
        spacing: { medium: 8 },
        radii: { small: 4 }
      },
      interpolation: 0,
      viewport: { width: 800, height: 600, scale: 1, offset: { x: 0, y: 0 } }
    };
  });

  it('should have correct module properties', () => {
    expect(renderModule.name).toBe('mode7');
    expect(renderModule.nodeTypes).toEqual(['Mode7Plane']);
  });

  it('should render placeholder when texture is missing', () => {
    const mockNode = {
      id: 'test',
      type: 'Mode7Plane',
      texture: 'missing-texture',
      horizon: 0.5,
      scale: 1.0,
      offset: { x: 0, y: 0 }
    } as any;

    renderModule.render(mockNode, mockContext);

    // Should create gradient and draw horizon line
    expect(mockCtx.createLinearGradient).toHaveBeenCalled();
    expect(mockCtx.fillRect).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
  });

  it('should handle missing Mode-7 data gracefully', () => {
    const mockNode = {
      id: 'test',
      type: 'Mode7Plane'
      // Missing required texture property
    } as any;

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    renderModule.render(mockNode, mockContext);

    expect(consoleSpy).toHaveBeenCalledWith('Mode7Plane node missing required data');
    
    consoleSpy.mockRestore();
  });

  it('should use default values for optional properties', () => {
    const mockNode = {
      id: 'test',
      type: 'Mode7Plane',
      texture: 'test-texture'
      // Missing optional properties
    } as any;

    // Mock the private method to test data extraction
    const getMode7DataSpy = vi.spyOn(renderModule as any, 'getMode7Data');
    
    renderModule.render(mockNode, mockContext);

    expect(getMode7DataSpy).toHaveBeenCalled();
    const result = getMode7DataSpy.mock.results[0].value;
    
    expect(result.horizon).toBe(0.5);
    expect(result.scale).toBe(1.0);
    expect(result.offset).toEqual({ x: 0, y: 0 });
    expect(result.textureWidth).toBe(256);
    expect(result.textureHeight).toBe(256);
  });
});

describe('Mode7ModuleDefinition', () => {
  it('should have correct module definition', () => {
    expect(Mode7ModuleDefinition.name).toBe('mode7');
    expect(Mode7ModuleDefinition.nodeTypes).toEqual(['Mode7Plane']);
    expect(Mode7ModuleDefinition.actions).toEqual(['setMode7Camera', 'moveMode7Camera']);
    expect(Mode7ModuleDefinition.triggers).toEqual([]);
    expect(Mode7ModuleDefinition.dependencies).toEqual([]);
    expect(Mode7ModuleDefinition.size).toBe(8);
  });
});

describe('registerMode7Module', () => {
  let registry: ModuleRegistry;

  beforeEach(() => {
    registry = ModuleRegistry.getInstance();
    // Clear any existing registrations
    (registry as any).modules.clear();
    (registry as any).renderModules.clear();
    (registry as any).actionHandlers.clear();
  });

  it('should register module definition', () => {
    registerMode7Module();
    
    const module = registry.getModule('mode7');
    expect(module).toBeDefined();
    expect(module?.name).toBe('mode7');
  });

  it('should register render module', () => {
    registerMode7Module();
    
    const renderModule = registry.getRenderModule('mode7');
    expect(renderModule).toBeDefined();
    expect(renderModule?.name).toBe('mode7');
  });

  it('should register action handlers', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    registerMode7Module();
    
    const setHandler = registry.getActionHandler('setMode7Camera');
    const moveHandler = registry.getActionHandler('moveMode7Camera');
    
    expect(setHandler).toBeDefined();
    expect(moveHandler).toBeDefined();
    
    // Test handlers
    setHandler!({ test: 'data' });
    moveHandler!({ test: 'data' });
    
    expect(consoleSpy).toHaveBeenCalledWith('setMode7Camera action:', { test: 'data' });
    expect(consoleSpy).toHaveBeenCalledWith('moveMode7Camera action:', { test: 'data' });
    
    consoleSpy.mockRestore();
  });

  it('should support Mode7Plane node type', () => {
    registerMode7Module();
    
    expect(registry.supportsNodeType('Mode7Plane')).toBe(true);
  });
});

describe('Mode-7 Math Accuracy', () => {
  it('should maintain mathematical consistency across transformations', () => {
    const camera = Mode7Math.createDefaultCamera();
    camera.position = { x: 100, y: 200 };
    camera.rotation = Math.PI / 4;
    camera.height = 150;
    
    const viewport = { width: 1024, height: 768, horizon: 0.4 };
    
    // Test multiple points for consistency
    const testPoints = [
      { x: 300, y: 400 },
      { x: 600, y: 500 },
      { x: 200, y: 350 },
      { x: 800, y: 600 }
    ];
    
    testPoints.forEach(screenPoint => {
      const worldPos = Mode7Math.screenToWorld(screenPoint.x, screenPoint.y, camera, viewport);
      const backToScreen = Mode7Math.worldToScreen(worldPos.x, worldPos.y, camera, viewport);
      
      // Allow for small floating-point errors
      expect(backToScreen.x).toBeCloseTo(screenPoint.x, 0);
      expect(backToScreen.y).toBeCloseTo(screenPoint.y, 0);
    });
  });

  it('should handle extreme camera parameters', () => {
    const extremeCamera = Mode7Math.createDefaultCamera();
    extremeCamera.height = 1000;
    extremeCamera.pitch = Math.PI / 2 - 0.1; // Nearly vertical
    extremeCamera.rotation = Math.PI * 1.5;  // 270 degrees
    
    const viewport = { width: 800, height: 600, horizon: 0.1 };
    
    // Should not crash or produce NaN values
    const worldPos = Mode7Math.screenToWorld(400, 500, extremeCamera, viewport);
    expect(isNaN(worldPos.x)).toBe(false);
    expect(isNaN(worldPos.y)).toBe(false);
    expect(isFinite(worldPos.x)).toBe(true);
    expect(isFinite(worldPos.y)).toBe(true);
  });

  it('should handle texture coordinate edge cases', () => {
    const textureSize = { x: 128, y: 128 };
    const scale = 0.5;
    const offset = { x: -1000, y: 2000 };
    
    // Test with extreme world coordinates
    const extremePos = { x: 999999, y: -999999 };
    const texCoords = Mode7Math.getTextureCoordinates(extremePos, textureSize, scale, offset);
    
    // Should wrap correctly and stay within texture bounds
    expect(texCoords.x).toBeGreaterThanOrEqual(0);
    expect(texCoords.x).toBeLessThan(textureSize.x);
    expect(texCoords.y).toBeGreaterThanOrEqual(0);
    expect(texCoords.y).toBeLessThan(textureSize.y);
  });
});