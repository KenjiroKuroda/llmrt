/**
 * Tests for isometric tilemap rendering module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  IsoMath, 
  IsoRenderModule, 
  IsoModuleDefinition, 
  registerIsoModule,
  TilemapIsoData,
  IsoCamera,
  TileCollision
} from './iso.js';
import { ModuleRegistry } from '../core/module-registry.js';
import { RenderContext, TilemapIsoNode } from '../types/modules.js';
import { Vector2 } from '../types/core.js';

describe('IsoMath', () => {
  const standardTileSize: Vector2 = { x: 64, y: 32 };

  describe('worldToIso', () => {
    it('should convert world coordinates to isometric coordinates', () => {
      const result = IsoMath.worldToIso(1, 0, standardTileSize);
      expect(result.x).toBe(32); // (1 - 0) * 32
      expect(result.y).toBe(16); // (1 + 0) * 16
    });

    it('should handle negative coordinates', () => {
      const result = IsoMath.worldToIso(-1, 1, standardTileSize);
      expect(result.x).toBe(-64); // (-1 - 1) * 32
      expect(result.y).toBe(0);   // (-1 + 1) * 16
    });

    it('should handle origin correctly', () => {
      const result = IsoMath.worldToIso(0, 0, standardTileSize);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });
  });

  describe('isoToWorld', () => {
    it('should convert isometric coordinates to world coordinates', () => {
      const result = IsoMath.isoToWorld(32, 16, standardTileSize);
      expect(result.x).toBeCloseTo(1, 5);
      expect(result.y).toBeCloseTo(0, 5);
    });

    it('should be inverse of worldToIso', () => {
      const original = { x: 3, y: 2 };
      const iso = IsoMath.worldToIso(original.x, original.y, standardTileSize);
      const backToWorld = IsoMath.isoToWorld(iso.x, iso.y, standardTileSize);
      
      expect(backToWorld.x).toBeCloseTo(original.x, 5);
      expect(backToWorld.y).toBeCloseTo(original.y, 5);
    });

    it('should handle negative isometric coordinates', () => {
      const result = IsoMath.isoToWorld(-64, 0, standardTileSize);
      expect(result.x).toBeCloseTo(-1, 5);
      expect(result.y).toBeCloseTo(1, 5);
    });
  });

  describe('tileToIso', () => {
    it('should convert tile coordinates to isometric screen coordinates', () => {
      const result = IsoMath.tileToIso(2, 1, standardTileSize);
      expect(result.x).toBe(32); // (2 - 1) * 32
      expect(result.y).toBe(48); // (2 + 1) * 16
    });

    it('should apply elevation offset', () => {
      const withoutElevation = IsoMath.tileToIso(1, 1, standardTileSize, 0);
      const withElevation = IsoMath.tileToIso(1, 1, standardTileSize, 2);
      
      expect(withElevation.x).toBe(withoutElevation.x);
      expect(withElevation.y).toBe(withoutElevation.y - 16); // 2 * (32/4)
    });

    it('should handle zero tile coordinates', () => {
      const result = IsoMath.tileToIso(0, 0, standardTileSize);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });
  });

  describe('screenToTile', () => {
    const camera: IsoCamera = {
      position: { x: 0, y: 0 },
      zoom: 1,
      offset: { x: 400, y: 300 }
    };

    it('should convert screen coordinates to tile coordinates', () => {
      // Screen center should map to tile (0, 0) with default camera
      const result = IsoMath.screenToTile(400, 300, camera, standardTileSize);
      expect(Math.floor(result.x)).toBe(0);
      expect(Math.floor(result.y)).toBe(0);
    });

    it('should handle camera zoom', () => {
      const zoomedCamera: IsoCamera = { ...camera, zoom: 2 };
      const result = IsoMath.screenToTile(400, 300, zoomedCamera, standardTileSize);
      expect(Math.floor(result.x)).toBe(0);
      expect(Math.floor(result.y)).toBe(0);
    });

    it('should handle camera position offset', () => {
      const offsetCamera: IsoCamera = { 
        ...camera, 
        position: { x: 32, y: 16 } // Adjusted to match expected tile (1,0) in iso coordinates
      };
      const result = IsoMath.screenToTile(400, 300, offsetCamera, standardTileSize);
      expect(result.x).toBeCloseTo(1, 0);
      expect(result.y).toBeCloseTo(0, 0);
    });
  });

  describe('getTileBounds', () => {
    it('should calculate correct tile bounds', () => {
      const bounds = IsoMath.getTileBounds(0, 0, standardTileSize);
      
      expect(bounds.topLeft.x).toBe(-32);
      expect(bounds.topLeft.y).toBe(0);
      expect(bounds.topRight.x).toBe(0);
      expect(bounds.topRight.y).toBe(-16);
      expect(bounds.bottomLeft.x).toBe(0);
      expect(bounds.bottomLeft.y).toBe(16);
      expect(bounds.bottomRight.x).toBe(32);
      expect(bounds.bottomRight.y).toBe(0);
    });

    it('should apply elevation offset to bounds', () => {
      const boundsNoElevation = IsoMath.getTileBounds(0, 0, standardTileSize, 0);
      const boundsWithElevation = IsoMath.getTileBounds(0, 0, standardTileSize, 2);
      
      const elevationOffset = 2 * (standardTileSize.y / 4);
      
      expect(boundsWithElevation.topLeft.y).toBe(boundsNoElevation.topLeft.y - elevationOffset);
      expect(boundsWithElevation.topRight.y).toBe(boundsNoElevation.topRight.y - elevationOffset);
      expect(boundsWithElevation.bottomLeft.y).toBe(boundsNoElevation.bottomLeft.y - elevationOffset);
      expect(boundsWithElevation.bottomRight.y).toBe(boundsNoElevation.bottomRight.y - elevationOffset);
    });
  });

  describe('isPointInTile', () => {
    it('should detect point inside tile diamond', () => {
      // Point at tile center should be inside
      const result = IsoMath.isPointInTile(0, 0, 0, 0, standardTileSize);
      expect(result).toBe(true);
    });

    it('should detect point outside tile diamond', () => {
      // Point far from tile should be outside
      const result = IsoMath.isPointInTile(100, 100, 0, 0, standardTileSize);
      expect(result).toBe(false);
    });

    it('should handle points on tile edges', () => {
      // Point at top of diamond (slightly inside to account for floating point precision)
      const topResult = IsoMath.isPointInTile(0, -15, 0, 0, standardTileSize);
      expect(topResult).toBe(true);
      
      // Point at right of diamond (slightly inside to account for floating point precision)
      const rightResult = IsoMath.isPointInTile(31, 0, 0, 0, standardTileSize);
      expect(rightResult).toBe(true);
    });

    it('should handle elevation correctly', () => {
      const elevation = 2;
      const elevatedTileCenter = IsoMath.tileToIso(0, 0, standardTileSize, elevation);
      
      const result = IsoMath.isPointInTile(
        elevatedTileCenter.x, 
        elevatedTileCenter.y, 
        0, 
        0, 
        standardTileSize, 
        elevation
      );
      expect(result).toBe(true);
    });
  });

  describe('getVisibleTiles', () => {
    const camera: IsoCamera = {
      position: { x: 0, y: 0 },
      zoom: 1,
      offset: { x: 0, y: 0 }
    };
    const viewport = { width: 800, height: 600 };

    it('should return reasonable tile range for viewport', () => {
      const visible = IsoMath.getVisibleTiles(camera, viewport, standardTileSize, 20, 20);
      
      expect(visible.startX).toBeGreaterThanOrEqual(0);
      expect(visible.endX).toBeLessThan(20);
      expect(visible.startY).toBeGreaterThanOrEqual(0);
      expect(visible.endY).toBeLessThan(20);
      expect(visible.startX).toBeLessThanOrEqual(visible.endX);
      expect(visible.startY).toBeLessThanOrEqual(visible.endY);
    });

    it('should respect map boundaries', () => {
      const smallMapWidth = 5;
      const smallMapHeight = 5;
      const visible = IsoMath.getVisibleTiles(camera, viewport, standardTileSize, smallMapWidth, smallMapHeight);
      
      expect(visible.startX).toBeGreaterThanOrEqual(0);
      expect(visible.endX).toBeLessThan(smallMapWidth);
      expect(visible.startY).toBeGreaterThanOrEqual(0);
      expect(visible.endY).toBeLessThan(smallMapHeight);
    });

    it('should handle zoomed camera', () => {
      const zoomedCamera: IsoCamera = { ...camera, zoom: 2 };
      const normalVisible = IsoMath.getVisibleTiles(camera, viewport, standardTileSize, 20, 20);
      const zoomedVisible = IsoMath.getVisibleTiles(zoomedCamera, viewport, standardTileSize, 20, 20);
      
      // Zoomed camera should see fewer tiles
      const normalTileCount = (normalVisible.endX - normalVisible.startX + 1) * (normalVisible.endY - normalVisible.startY + 1);
      const zoomedTileCount = (zoomedVisible.endX - zoomedVisible.startX + 1) * (zoomedVisible.endY - zoomedVisible.startY + 1);
      
      expect(zoomedTileCount).toBeLessThanOrEqual(normalTileCount);
    });
  });

  describe('calculateRenderOrder', () => {
    it('should return tiles in back-to-front order', () => {
      const tiles = IsoMath.calculateRenderOrder(0, 2, 0, 2);
      
      expect(tiles).toHaveLength(9); // 3x3 grid
      
      // First tile should be top-left (0,0)
      expect(tiles[0]).toEqual({ x: 0, y: 0 });
      
      // Last tile should be bottom-right (2,2)
      expect(tiles[tiles.length - 1]).toEqual({ x: 2, y: 2 });
      
      // Verify sorting order
      for (let i = 1; i < tiles.length; i++) {
        const prevPriority = tiles[i - 1].x + tiles[i - 1].y;
        const currPriority = tiles[i].x + tiles[i].y;
        expect(currPriority).toBeGreaterThanOrEqual(prevPriority);
      }
    });

    it('should handle single tile', () => {
      const tiles = IsoMath.calculateRenderOrder(1, 1, 1, 1);
      expect(tiles).toHaveLength(1);
      expect(tiles[0]).toEqual({ x: 1, y: 1 });
    });

    it('should handle empty range', () => {
      const tiles = IsoMath.calculateRenderOrder(2, 1, 2, 1); // Invalid range
      expect(tiles).toHaveLength(0);
    });
  });

  describe('createDefaultCamera', () => {
    it('should create camera with sensible defaults', () => {
      const camera = IsoMath.createDefaultCamera();
      
      expect(camera.position.x).toBe(0);
      expect(camera.position.y).toBe(0);
      expect(camera.zoom).toBe(1.0);
      expect(camera.offset.x).toBe(0);
      expect(camera.offset.y).toBe(0);
    });
  });

  describe('getTileCollision', () => {
    const map = [
      [1, 2, 0],
      [3, 0, 4],
      [0, 5, 6]
    ];
    const elevation = [
      [0, 1, 0],
      [2, 0, 1],
      [0, 3, 0]
    ];

    it('should return collision data for solid tiles', () => {
      const collision = IsoMath.getTileCollision(0.5, 0.5, map, elevation, standardTileSize);
      
      expect(collision).not.toBeNull();
      expect(collision!.tileX).toBe(0);
      expect(collision!.tileY).toBe(0);
      expect(collision!.tileIndex).toBe(1);
      expect(collision!.elevation).toBe(0);
    });

    it('should return null for empty tiles', () => {
      const collision = IsoMath.getTileCollision(2.5, 0.5, map, elevation, standardTileSize);
      expect(collision).toBeNull();
    });

    it('should return null for out-of-bounds coordinates', () => {
      const collision = IsoMath.getTileCollision(-1, -1, map, elevation, standardTileSize);
      expect(collision).toBeNull();
      
      const collision2 = IsoMath.getTileCollision(10, 10, map, elevation, standardTileSize);
      expect(collision2).toBeNull();
    });

    it('should include elevation data', () => {
      const collision = IsoMath.getTileCollision(1.5, 1.5, map, elevation, standardTileSize);
      
      expect(collision).toBeNull(); // This is an empty tile
      
      const collision2 = IsoMath.getTileCollision(0.5, 1.5, map, elevation, standardTileSize);
      expect(collision2).not.toBeNull();
      expect(collision2!.elevation).toBe(2);
    });

    it('should calculate correct world position', () => {
      const collision = IsoMath.getTileCollision(1.5, 0.5, map, elevation, standardTileSize);
      
      expect(collision).not.toBeNull();
      expect(collision!.worldPos.x).toBe(32); // (1 - 0) * 32
      expect(collision!.worldPos.y).toBe(8); // (1 + 0) * 16 - 1 * 8 (elevation 1 from test data)
    });
  });
});

describe('IsoRenderModule', () => {
  let renderModule: IsoRenderModule;
  let mockContext: RenderContext;
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    renderModule = new IsoRenderModule();
    
    // Create mock canvas and context
    mockCanvas = {
      width: 800,
      height: 600,
      getContext: vi.fn()
    } as any;

    mockCtx = {
      fillStyle: '',
      fillRect: vi.fn(),
      strokeStyle: '',
      lineWidth: 0,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      globalAlpha: 1,
      font: '',
      textAlign: 'center',
      fillText: vi.fn()
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
    expect(renderModule.name).toBe('iso');
    expect(renderModule.nodeTypes).toEqual(['TilemapIso']);
  });

  it('should render placeholder when tileset is missing', () => {
    const mockNode: TilemapIsoNode = {
      id: 'test',
      type: 'TilemapIso',
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
      tileset: 'missing-tileset',
      map: [[1, 2], [3, 0]],
      tileSize: { x: 64, y: 32 },
      elevation: [[0, 1], [2, 0]],
      addChild: vi.fn(),
      removeChild: vi.fn(),
      removeFromParent: vi.fn(),
      getRoot: vi.fn(),
      getDepth: vi.fn(),
      getWorldTransform: vi.fn(),
      isWorldVisible: vi.fn()
    };

    renderModule.render(mockNode, mockContext);

    // Should clear background and draw placeholder tiles
    expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
    expect(mockCtx.stroke).toHaveBeenCalled();
    expect(mockCtx.fill).toHaveBeenCalled();
  });

  it('should handle missing tilemap data gracefully', () => {
    const mockNode = {
      id: 'test',
      type: 'TilemapIso'
      // Missing required map property
    } as any;

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    renderModule.render(mockNode, mockContext);

    expect(consoleSpy).toHaveBeenCalledWith('TilemapIso node missing required data');
    
    consoleSpy.mockRestore();
  });

  it('should use default values for optional properties', () => {
    const mockNode: TilemapIsoNode = {
      id: 'test',
      type: 'TilemapIso',
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
      tileset: '',
      map: [[1]],
      tileSize: { x: 64, y: 32 },
      elevation: [[0]],
      addChild: vi.fn(),
      removeChild: vi.fn(),
      removeFromParent: vi.fn(),
      getRoot: vi.fn(),
      getDepth: vi.fn(),
      getWorldTransform: vi.fn(),
      isWorldVisible: vi.fn()
    };

    // Mock the private method to test data extraction
    const getIsoDataSpy = vi.spyOn(renderModule as any, 'getIsoData');
    
    renderModule.render(mockNode, mockContext);

    expect(getIsoDataSpy).toHaveBeenCalled();
    const result = getIsoDataSpy.mock.results[0].value;
    
    expect(result.tileSize).toEqual({ x: 64, y: 32 });
    expect(result.tilesetColumns).toBe(8);
    expect(result.tilesetRows).toBe(8);
  });

  it('should handle empty maps', () => {
    const mockNode: TilemapIsoNode = {
      id: 'test',
      type: 'TilemapIso',
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
      tileset: 'test',
      map: [],
      tileSize: { x: 64, y: 32 },
      elevation: [],
      addChild: vi.fn(),
      removeChild: vi.fn(),
      removeFromParent: vi.fn(),
      getRoot: vi.fn(),
      getDepth: vi.fn(),
      getWorldTransform: vi.fn(),
      isWorldVisible: vi.fn()
    };

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    renderModule.render(mockNode, mockContext);

    expect(consoleSpy).toHaveBeenCalledWith('TilemapIso node missing required data');
    
    consoleSpy.mockRestore();
  });
});

describe('IsoModuleDefinition', () => {
  it('should have correct module definition', () => {
    expect(IsoModuleDefinition.name).toBe('iso');
    expect(IsoModuleDefinition.nodeTypes).toEqual(['TilemapIso']);
    expect(IsoModuleDefinition.actions).toEqual(['setIsoCamera', 'moveIsoCamera', 'setTileElevation']);
    expect(IsoModuleDefinition.triggers).toEqual(['on.tileClick', 'on.tileHover']);
    expect(IsoModuleDefinition.dependencies).toEqual([]);
    expect(IsoModuleDefinition.size).toBe(10);
  });
});

describe('registerIsoModule', () => {
  let registry: ModuleRegistry;

  beforeEach(() => {
    registry = ModuleRegistry.getInstance();
    // Clear any existing registrations
    (registry as any).modules.clear();
    (registry as any).renderModules.clear();
    (registry as any).actionHandlers.clear();
  });

  it('should register module definition', () => {
    registerIsoModule();
    
    const module = registry.getModule('iso');
    expect(module).toBeDefined();
    expect(module?.name).toBe('iso');
  });

  it('should register render module', () => {
    registerIsoModule();
    
    const renderModule = registry.getRenderModule('iso');
    expect(renderModule).toBeDefined();
    expect(renderModule?.name).toBe('iso');
  });

  it('should register action handlers', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    registerIsoModule();
    
    const setCameraHandler = registry.getActionHandler('setIsoCamera');
    const moveCameraHandler = registry.getActionHandler('moveIsoCamera');
    const setElevationHandler = registry.getActionHandler('setTileElevation');
    
    expect(setCameraHandler).toBeDefined();
    expect(moveCameraHandler).toBeDefined();
    expect(setElevationHandler).toBeDefined();
    
    // Test handlers
    setCameraHandler!({ test: 'data' });
    moveCameraHandler!({ test: 'data' });
    setElevationHandler!({ test: 'data' });
    
    expect(consoleSpy).toHaveBeenCalledWith('setIsoCamera action:', { test: 'data' });
    expect(consoleSpy).toHaveBeenCalledWith('moveIsoCamera action:', { test: 'data' });
    expect(consoleSpy).toHaveBeenCalledWith('setTileElevation action:', { test: 'data' });
    
    consoleSpy.mockRestore();
  });

  it('should support TilemapIso node type', () => {
    registerIsoModule();
    
    expect(registry.supportsNodeType('TilemapIso')).toBe(true);
  });
});

describe('Isometric Math Accuracy', () => {
  const tileSize: Vector2 = { x: 64, y: 32 };

  it('should maintain mathematical consistency across transformations', () => {
    const testTiles = [
      { x: 0, y: 0 },
      { x: 5, y: 3 },
      { x: -2, y: 4 },
      { x: 10, y: -5 }
    ];
    
    testTiles.forEach(tile => {
      const isoPos = IsoMath.tileToIso(tile.x, tile.y, tileSize);
      const worldPos = IsoMath.isoToWorld(isoPos.x, isoPos.y, tileSize);
      
      expect(worldPos.x).toBeCloseTo(tile.x, 5);
      expect(worldPos.y).toBeCloseTo(tile.y, 5);
    });
  });

  it('should handle extreme tile coordinates', () => {
    const extremeTiles = [
      { x: 1000, y: 1000 },
      { x: -1000, y: -1000 },
      { x: 0, y: 1000 },
      { x: 1000, y: 0 }
    ];
    
    extremeTiles.forEach(tile => {
      const isoPos = IsoMath.tileToIso(tile.x, tile.y, tileSize);
      
      expect(isNaN(isoPos.x)).toBe(false);
      expect(isNaN(isoPos.y)).toBe(false);
      expect(isFinite(isoPos.x)).toBe(true);
      expect(isFinite(isoPos.y)).toBe(true);
    });
  });

  it('should handle different tile sizes correctly', () => {
    const tileSizes = [
      { x: 32, y: 16 },
      { x: 128, y: 64 },
      { x: 48, y: 24 }
    ];
    
    tileSizes.forEach(size => {
      const tile = { x: 2, y: 3 };
      const isoPos = IsoMath.tileToIso(tile.x, tile.y, size);
      const worldPos = IsoMath.isoToWorld(isoPos.x, isoPos.y, size);
      
      expect(worldPos.x).toBeCloseTo(tile.x, 5);
      expect(worldPos.y).toBeCloseTo(tile.y, 5);
    });
  });

  it('should handle elevation consistently', () => {
    const tile = { x: 1, y: 1 };
    const elevations = [0, 1, 5, 10];
    
    elevations.forEach(elevation => {
      const isoPos = IsoMath.tileToIso(tile.x, tile.y, tileSize, elevation);
      const bounds = IsoMath.getTileBounds(tile.x, tile.y, tileSize, elevation);
      
      // Elevation should only affect Y coordinate
      const baseIsoPos = IsoMath.tileToIso(tile.x, tile.y, tileSize, 0);
      expect(isoPos.x).toBe(baseIsoPos.x);
      expect(isoPos.y).toBe(baseIsoPos.y - elevation * (tileSize.y / 4));
      
      // Bounds should be consistent with tile position
      const centerX = (bounds.topLeft.x + bounds.bottomRight.x) / 2;
      const centerY = (bounds.topRight.y + bounds.bottomLeft.y) / 2;
      expect(centerX).toBeCloseTo(isoPos.x, 1);
      expect(centerY).toBeCloseTo(isoPos.y, 1);
    });
  });
});

describe('Performance Tests', () => {
  it('should handle large maps efficiently', () => {
    const largeMap = Array(100).fill(null).map(() => Array(100).fill(1));
    const elevation = Array(100).fill(null).map(() => Array(100).fill(0));
    const camera = IsoMath.createDefaultCamera();
    const viewport = { width: 800, height: 600 };
    const tileSize = { x: 64, y: 32 };
    
    const startTime = performance.now();
    
    const visibleTiles = IsoMath.getVisibleTiles(camera, viewport, tileSize, 100, 100);
    const renderOrder = IsoMath.calculateRenderOrder(
      visibleTiles.startX, 
      visibleTiles.endX, 
      visibleTiles.startY, 
      visibleTiles.endY
    );
    
    // Simulate collision detection for visible tiles
    renderOrder.forEach(tile => {
      IsoMath.getTileCollision(tile.x + 0.5, tile.y + 0.5, largeMap, elevation, tileSize);
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Should complete within reasonable time
    expect(duration).toBeLessThan(50);
  });

  it('should handle many collision checks efficiently', () => {
    const map = Array(50).fill(null).map(() => Array(50).fill(1));
    const elevation = Array(50).fill(null).map(() => Array(50).fill(0));
    const tileSize = { x: 64, y: 32 };
    
    const startTime = performance.now();
    
    // Test 1000 random collision checks
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * 50;
      const y = Math.random() * 50;
      IsoMath.getTileCollision(x, y, map, elevation, tileSize);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Should handle many collision checks quickly
    expect(duration).toBeLessThan(10);
  });
});