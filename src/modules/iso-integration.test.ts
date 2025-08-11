/**
 * Integration tests for isometric tilemap module with core systems
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerIsoModule, IsoMath } from './iso.js';
import { ModuleRegistry } from '../core/module-registry.js';
import { TilemapIsoNode } from '../types/modules.js';

describe('Isometric Module Integration', () => {
  let registry: ModuleRegistry;

  beforeEach(() => {
    registry = ModuleRegistry.getInstance();
    // Clear any existing registrations
    (registry as any).modules.clear();
    (registry as any).renderModules.clear();
    (registry as any).actionHandlers.clear();
    (registry as any).triggerEvents.clear();
  });

  describe('Module Registration', () => {
    it('should register all components correctly', () => {
      registerIsoModule();

      // Check module definition
      const module = registry.getModule('iso');
      expect(module).toBeDefined();
      expect(module!.name).toBe('iso');
      expect(module!.nodeTypes).toContain('TilemapIso');
      expect(module!.actions).toContain('setIsoCamera');
      expect(module!.actions).toContain('moveIsoCamera');
      expect(module!.actions).toContain('setTileElevation');
      expect(module!.triggers).toContain('on.tileClick');
      expect(module!.triggers).toContain('on.tileHover');

      // Check render module
      const renderModule = registry.getRenderModule('iso');
      expect(renderModule).toBeDefined();
      expect(renderModule!.name).toBe('iso');
      expect(renderModule!.nodeTypes).toContain('TilemapIso');

      // Check action handlers
      expect(registry.getActionHandler('setIsoCamera')).toBeDefined();
      expect(registry.getActionHandler('moveIsoCamera')).toBeDefined();
      expect(registry.getActionHandler('setTileElevation')).toBeDefined();

      // Check node type support
      expect(registry.supportsNodeType('TilemapIso')).toBe(true);

      // Check trigger event support
      expect(registry.supportsTriggerEvent('on.tileClick')).toBe(true);
      expect(registry.supportsTriggerEvent('on.tileHover')).toBe(true);
    });

    it('should not interfere with core node types', () => {
      registerIsoModule();

      // Core node types should still be supported
      expect(registry.supportsNodeType('Group')).toBe(true);
      expect(registry.supportsNodeType('Sprite')).toBe(true);
      expect(registry.supportsNodeType('Text')).toBe(true);
      expect(registry.supportsNodeType('Button')).toBe(true);
      expect(registry.supportsNodeType('Camera2D')).toBe(true);
    });

    it('should not interfere with core trigger events', () => {
      registerIsoModule();

      // Core trigger events should still be supported
      expect(registry.supportsTriggerEvent('on.start')).toBe(true);
      expect(registry.supportsTriggerEvent('on.tick')).toBe(true);
      expect(registry.supportsTriggerEvent('on.key')).toBe(true);
      expect(registry.supportsTriggerEvent('on.pointer')).toBe(true);
      expect(registry.supportsTriggerEvent('on.timer')).toBe(true);
    });
  });

  describe('Render Module Integration', () => {
    it('should be discoverable by node type', () => {
      registerIsoModule();

      const renderModules = registry.getRenderModulesForNodeType('TilemapIso');
      expect(renderModules).toHaveLength(1);
      expect(renderModules[0].name).toBe('iso');
    });

    it('should not be returned for other node types', () => {
      registerIsoModule();

      const spriteModules = registry.getRenderModulesForNodeType('Sprite');
      expect(spriteModules.filter(m => m.name === 'iso')).toHaveLength(0);
    });
  });

  describe('Action System Integration', () => {
    it('should execute action handlers without errors', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      registerIsoModule();

      const setCameraHandler = registry.getActionHandler('setIsoCamera');
      const moveCameraHandler = registry.getActionHandler('moveIsoCamera');
      const setElevationHandler = registry.getActionHandler('setTileElevation');

      // Test action execution
      expect(() => setCameraHandler!({ position: { x: 10, y: 5 }, zoom: 2 })).not.toThrow();
      expect(() => moveCameraHandler!({ deltaX: 1, deltaY: -1 })).not.toThrow();
      expect(() => setElevationHandler!({ tileX: 2, tileY: 3, elevation: 5 })).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledTimes(3);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Scene Tree Integration', () => {
    it('should create valid TilemapIso nodes', () => {
      registerIsoModule();

      const mockNode: TilemapIsoNode = {
        id: 'iso-map',
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
        tileset: 'dungeon-tiles',
        map: [
          [1, 2, 3],
          [4, 0, 5],
          [6, 7, 8]
        ],
        tileSize: { x: 64, y: 32 },
        elevation: [
          [0, 1, 0],
          [2, 0, 1],
          [0, 3, 2]
        ],
        addChild: vi.fn(),
        removeChild: vi.fn(),
        removeFromParent: vi.fn(),
        getRoot: vi.fn(),
        getDepth: vi.fn(),
        getWorldTransform: vi.fn(),
        isWorldVisible: vi.fn()
      };

      // Node should be valid
      expect(mockNode.type).toBe('TilemapIso');
      expect(registry.supportsNodeType(mockNode.type)).toBe(true);
      
      // Should have required properties
      expect(mockNode.tileset).toBeDefined();
      expect(mockNode.map).toBeDefined();
      expect(mockNode.tileSize).toBeDefined();
      expect(mockNode.elevation).toBeDefined();
    });
  });

  describe('Multi-Module Compatibility', () => {
    it('should work alongside other modules', () => {
      // Register multiple modules (simulating other modules being present)
      registerIsoModule();
      
      // Simulate registering another module
      const mockModule = {
        name: 'test-module',
        nodeTypes: ['TestNode'],
        actions: ['testAction'],
        triggers: ['on.test'],
        dependencies: [],
        size: 5
      };
      
      registry.registerModule(mockModule);

      // Both modules should be registered
      expect(registry.getModule('iso')).toBeDefined();
      expect(registry.getModule('test-module')).toBeDefined();
      
      // Node types should not conflict
      expect(registry.supportsNodeType('TilemapIso')).toBe(true);
      expect(registry.supportsNodeType('TestNode')).toBe(true);
      
      // Size calculation should include both modules
      expect(registry.getEstimatedSize()).toBe(15); // 10 + 5
    });
  });

  describe('Game Logic Integration', () => {
    it('should provide collision detection for game logic', () => {
      const map = [
        [1, 1, 1, 1],
        [1, 0, 0, 1],
        [1, 0, 2, 1],
        [1, 1, 1, 1]
      ];
      
      const elevation = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 2, 0],
        [0, 0, 0, 0]
      ];
      
      const tileSize = { x: 64, y: 32 };

      // Test collision detection at various points
      const wallCollision = IsoMath.getTileCollision(0.5, 0.5, map, elevation, tileSize);
      expect(wallCollision).not.toBeNull();
      expect(wallCollision!.tileIndex).toBe(1);
      expect(wallCollision!.elevation).toBe(0);

      const emptyCollision = IsoMath.getTileCollision(1.5, 1.5, map, elevation, tileSize);
      expect(emptyCollision).toBeNull();

      const elevatedCollision = IsoMath.getTileCollision(2.5, 2.5, map, elevation, tileSize);
      expect(elevatedCollision).not.toBeNull();
      expect(elevatedCollision!.tileIndex).toBe(2);
      expect(elevatedCollision!.elevation).toBe(2);
    });

    it('should support pathfinding integration', () => {
      const map = [
        [1, 1, 1, 1, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 1, 0, 1],
        [1, 0, 0, 0, 1],
        [1, 1, 1, 1, 1]
      ];
      
      const elevation = Array(5).fill(null).map(() => Array(5).fill(0));
      const tileSize = { x: 64, y: 32 };

      // Simulate pathfinding by checking walkable tiles
      const walkableTiles: Array<{ x: number; y: number }> = [];
      
      for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
          const collision = IsoMath.getTileCollision(x + 0.5, y + 0.5, map, elevation, tileSize);
          if (!collision) { // No collision means walkable
            walkableTiles.push({ x, y });
          }
        }
      }

      // Should find the open areas
      expect(walkableTiles).toContainEqual({ x: 1, y: 1 });
      expect(walkableTiles).toContainEqual({ x: 2, y: 1 });
      expect(walkableTiles).toContainEqual({ x: 3, y: 1 });
      expect(walkableTiles).toContainEqual({ x: 1, y: 3 });
      expect(walkableTiles).toContainEqual({ x: 3, y: 3 });
      
      // Should not include walls
      expect(walkableTiles).not.toContainEqual({ x: 0, y: 0 });
      expect(walkableTiles).not.toContainEqual({ x: 2, y: 2 });
    });
  });

  describe('Camera System Integration', () => {
    it('should work with different camera configurations', () => {
      const tileSize = { x: 64, y: 32 };
      const viewport = { width: 800, height: 600 };
      
      // Test different camera setups
      const cameras = [
        { position: { x: 0, y: 0 }, zoom: 1, offset: { x: 400, y: 300 } },
        { position: { x: 100, y: 50 }, zoom: 2, offset: { x: 400, y: 300 } },
        { position: { x: -50, y: 25 }, zoom: 0.5, offset: { x: 200, y: 150 } }
      ];

      cameras.forEach(camera => {
        const visibleTiles = IsoMath.getVisibleTiles(camera, viewport, tileSize, 20, 20);
        
        // Should return valid tile ranges
        expect(visibleTiles.startX).toBeGreaterThanOrEqual(0);
        expect(visibleTiles.endX).toBeLessThan(20);
        expect(visibleTiles.startY).toBeGreaterThanOrEqual(0);
        expect(visibleTiles.endY).toBeLessThan(20);
        expect(visibleTiles.startX).toBeLessThanOrEqual(visibleTiles.endX);
        expect(visibleTiles.startY).toBeLessThanOrEqual(visibleTiles.endY);
      });
    });

    it('should handle screen-to-tile conversion for input', () => {
      const camera = { position: { x: 0, y: 0 }, zoom: 1, offset: { x: 400, y: 300 } };
      const tileSize = { x: 64, y: 32 };

      // Test mouse/touch input conversion
      const screenPositions = [
        { x: 400, y: 300 }, // Center
        { x: 432, y: 316 }, // One tile right
        { x: 368, y: 316 }, // One tile left
        { x: 400, y: 332 }  // One tile down
      ];

      screenPositions.forEach(screenPos => {
        const tilePos = IsoMath.screenToTile(screenPos.x, screenPos.y, camera, tileSize);
        
        // Should return valid tile coordinates
        expect(isFinite(tilePos.x)).toBe(true);
        expect(isFinite(tilePos.y)).toBe(true);
        expect(isNaN(tilePos.x)).toBe(false);
        expect(isNaN(tilePos.y)).toBe(false);
      });
    });
  });

  describe('Performance Integration', () => {
    it('should maintain performance with large scenes', () => {
      registerIsoModule();
      
      const largeMap = Array(50).fill(null).map(() => 
        Array(50).fill(null).map(() => Math.floor(Math.random() * 8) + 1)
      );
      
      const elevation = Array(50).fill(null).map(() => 
        Array(50).fill(null).map(() => Math.floor(Math.random() * 5))
      );

      const camera = { position: { x: 0, y: 0 }, zoom: 1, offset: { x: 400, y: 300 } };
      const viewport = { width: 800, height: 600 };
      const tileSize = { x: 64, y: 32 };

      const startTime = performance.now();

      // Simulate a full render cycle
      const visibleTiles = IsoMath.getVisibleTiles(camera, viewport, tileSize, 50, 50);
      const renderOrder = IsoMath.calculateRenderOrder(
        visibleTiles.startX,
        visibleTiles.endX,
        visibleTiles.startY,
        visibleTiles.endY
      );

      // Simulate rendering each visible tile
      renderOrder.forEach(tile => {
        const tileIndex = largeMap[tile.y][tile.x];
        const tileElevation = elevation[tile.y][tile.x];
        const screenPos = IsoMath.tileToIso(tile.x, tile.y, tileSize, tileElevation);
        
        // Simulate some rendering calculations
        const finalX = (screenPos.x - camera.position.x) * camera.zoom + camera.offset.x;
        const finalY = (screenPos.y - camera.position.y) * camera.zoom + camera.offset.y;
        
        // Ensure calculations are valid
        expect(isFinite(finalX)).toBe(true);
        expect(isFinite(finalY)).toBe(true);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time for 60fps
      expect(duration).toBeLessThan(16);
    });
  });
});