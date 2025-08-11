/**
 * Integration tests for raycast module with core engine systems
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RaycastModuleDefinition, registerRaycastModule } from './raycast.js';
import { ModuleRegistry } from '../core/module-registry.js';

describe('Raycast Module Integration', () => {
  let registry: ModuleRegistry;

  beforeEach(() => {
    // Reset module registry
    (ModuleRegistry as any).instance = undefined;
    registry = ModuleRegistry.getInstance();
  });

  describe('Module Registration', () => {
    it('should register raycast module correctly', () => {
      registerRaycastModule();

      const module = registry.getModule('raycast');
      expect(module).toBeDefined();
      expect(module?.name).toBe('raycast');
      expect(module?.nodeTypes).toContain('RaycastMap');
      expect(module?.actions).toContain('setRaycastCamera');
      expect(module?.actions).toContain('moveRaycastCamera');
      expect(module?.triggers).toContain('on.raycastHit');
    });

    it('should register render module', () => {
      registerRaycastModule();

      const renderModule = registry.getRenderModule('raycast');
      expect(renderModule).toBeDefined();
      expect(renderModule?.name).toBe('raycast');
      expect(renderModule?.nodeTypes).toContain('RaycastMap');
    });

    it('should register action handlers', () => {
      registerRaycastModule();

      const setHandler = registry.getActionHandler('setRaycastCamera');
      const moveHandler = registry.getActionHandler('moveRaycastCamera');

      expect(setHandler).toBeDefined();
      expect(moveHandler).toBeDefined();
    });

    it('should support RaycastMap node type after registration', () => {
      registerRaycastModule();

      expect(registry.supportsNodeType('RaycastMap')).toBe(true);
    });

    it('should support raycast trigger events after registration', () => {
      registerRaycastModule();

      expect(registry.supportsTriggerEvent('on.raycastHit')).toBe(true);
    });

    it('should find render modules for RaycastMap nodes', () => {
      registerRaycastModule();

      const renderModules = registry.getRenderModulesForNodeType('RaycastMap');
      expect(renderModules).toHaveLength(1);
      expect(renderModules[0].name).toBe('raycast');
    });
  });

  describe('Module Definition', () => {
    it('should have correct module definition properties', () => {
      expect(RaycastModuleDefinition.name).toBe('raycast');
      expect(RaycastModuleDefinition.nodeTypes).toEqual(['RaycastMap']);
      expect(RaycastModuleDefinition.actions).toEqual(['setRaycastCamera', 'moveRaycastCamera']);
      expect(RaycastModuleDefinition.triggers).toEqual(['on.raycastHit']);
      expect(RaycastModuleDefinition.dependencies).toEqual([]);
      expect(RaycastModuleDefinition.size).toBe(12);
    });

    it('should contribute to total estimated size', () => {
      registerRaycastModule();

      const totalSize = registry.getEstimatedSize();
      expect(totalSize).toBeGreaterThanOrEqual(12);
    });
  });

  describe('Action Handler Integration', () => {
    it('should call setRaycastCamera action handler', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      registerRaycastModule();

      const handler = registry.getActionHandler('setRaycastCamera');
      const params = {
        position: { x: 5, y: 5 },
        rotation: Math.PI / 4,
        height: 0.6
      };

      handler?.(params);

      expect(consoleSpy).toHaveBeenCalledWith('setRaycastCamera action:', params);
      consoleSpy.mockRestore();
    });

    it('should call moveRaycastCamera action handler', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      registerRaycastModule();

      const handler = registry.getActionHandler('moveRaycastCamera');
      const params = {
        deltaPosition: { x: 1, y: 0 },
        deltaRotation: 0.1
      };

      handler?.(params);

      expect(consoleSpy).toHaveBeenCalledWith('moveRaycastCamera action:', params);
      consoleSpy.mockRestore();
    });
  });

  describe('Render Module Integration', () => {
    it('should render RaycastMap nodes through module system', () => {
      registerRaycastModule();

      const renderModule = registry.getRenderModule('raycast');
      expect(renderModule).toBeDefined();

      // Create mock render context
      const mockCanvas = {
        width: 800,
        height: 600,
        getContext: () => mockContext
      } as any;
      
      const mockContext = {
        fillStyle: '',
        fillRect: vi.fn(),
        strokeStyle: '',
        lineWidth: 0,
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        globalAlpha: 1,
        createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(800 * 600 * 4) })),
        putImageData: vi.fn()
      } as any;

      const context = {
        canvas: mockCanvas,
        ctx: mockContext,
        camera: {
          position: { x: 0, y: 0 },
          zoom: 1,
          rotation: 0,
          target: { x: 0, y: 0 }
        },
        theme: {},
        interpolation: 0,
        viewport: {
          width: 800,
          height: 600,
          scale: 1,
          offset: { x: 0, y: 0 }
        }
      };

      // Create test RaycastMap node
      const node = {
        id: 'test-raycast',
        type: 'RaycastMap',
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
        map: [
          [1, 1, 1],
          [1, 0, 1],
          [1, 1, 1]
        ],
        textures: ['wall1'],
        billboards: [],
        fov: Math.PI / 3,
        renderDistance: 10,
        addChild: vi.fn(),
        removeChild: vi.fn(),
        removeFromParent: vi.fn(),
        getRoot: vi.fn(),
        getDepth: vi.fn(),
        getWorldTransform: vi.fn(),
        isWorldVisible: vi.fn()
      };

      // Should render without throwing
      expect(() => renderModule?.render(node, context)).not.toThrow();
    });
  });

  describe('Module Dependencies', () => {
    it('should have no dependencies', () => {
      expect(RaycastModuleDefinition.dependencies).toEqual([]);
    });

    it('should be loadable independently', () => {
      // Should be able to register without other modules
      expect(() => registerRaycastModule()).not.toThrow();
    });
  });

  describe('Tree-shaking Support', () => {
    it('should be excludable from builds', () => {
      // Module should not be registered by default
      expect(registry.getModule('raycast')).toBeUndefined();
      expect(registry.supportsNodeType('RaycastMap')).toBe(false);
    });

    it('should only add functionality when explicitly registered', () => {
      // Before registration
      expect(registry.getRenderModulesForNodeType('RaycastMap')).toHaveLength(0);
      expect(registry.getActionHandler('setRaycastCamera')).toBeUndefined();

      // After registration
      registerRaycastModule();
      expect(registry.getRenderModulesForNodeType('RaycastMap')).toHaveLength(1);
      expect(registry.getActionHandler('setRaycastCamera')).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle double registration gracefully', () => {
      registerRaycastModule();
      
      // Should not throw when registered twice
      expect(() => registerRaycastModule()).not.toThrow();
      
      // Should still work correctly
      expect(registry.getModule('raycast')).toBeDefined();
    });

    it('should handle missing render context gracefully', () => {
      registerRaycastModule();
      
      const renderModule = registry.getRenderModule('raycast');
      const invalidNode = { type: 'RaycastMap' } as any;
      const invalidContext = {} as any;

      // Should not crash with invalid context
      expect(() => renderModule?.render(invalidNode, invalidContext)).not.toThrow();
    });
  });

  describe('Performance Integration', () => {
    it('should contribute reasonable size to bundle', () => {
      registerRaycastModule();

      const moduleSize = registry.getModule('raycast')?.size || 0;
      
      // Should be reasonable size (less than 20KB)
      expect(moduleSize).toBeLessThan(20);
      expect(moduleSize).toBeGreaterThan(0);
    });

    it('should register efficiently', () => {
      const startTime = performance.now();
      
      registerRaycastModule();
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Registration should be fast (less than 1ms)
      expect(duration).toBeLessThan(1);
    });
  });
});