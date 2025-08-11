/**
 * Tests for raycast rendering module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  RaycastRenderModule, 
  RaycastMath, 
  RaycastMapData, 
  RaycastCamera,
  RayHit,
  BillboardRenderData
} from './raycast.js';
import { RaycastMapNode, Billboard } from '../types/modules.js';
import { Vector2 } from '../types/core.js';

describe('RaycastMath', () => {
  describe('castRay', () => {
    const simpleMap = [
      [1, 1, 1, 1],
      [1, 0, 0, 1],
      [1, 0, 0, 1],
      [1, 1, 1, 1]
    ];

    it('should detect wall hit in simple map', () => {
      const origin = { x: 1.5, y: 1.5 };
      const angle = 0; // Looking east
      const hit = RaycastMath.castRay(origin, angle, simpleMap, 4, 4, 1.0, 10);

      expect(hit.wallType).toBe(1);
      expect(hit.distance).toBeCloseTo(1.5, 2);
      expect(hit.side).toBe('west');
    });

    it('should return no hit when ray misses walls', () => {
      const emptyMap = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ];
      
      const origin = { x: 1.5, y: 1.5 };
      const angle = 0;
      const hit = RaycastMath.castRay(origin, angle, emptyMap, 4, 4, 1.0, 10);

      expect(hit.wallType).toBe(0);
      expect(hit.distance).toBe(10); // Max distance
    });

    it('should calculate correct texture coordinates', () => {
      const origin = { x: 1.5, y: 1.2 };
      const angle = 0; // Looking east
      const hit = RaycastMath.castRay(origin, angle, simpleMap, 4, 4, 1.0, 10);

      // Texture coordinate should be based on the fractional part of the hit position
      expect(hit.textureX).toBeGreaterThanOrEqual(0);
      expect(hit.textureX).toBeLessThanOrEqual(1);
    });

    it('should handle different wall sides correctly', () => {
      const origin = { x: 1.5, y: 1.5 };
      
      // Test east wall
      const eastHit = RaycastMath.castRay(origin, 0, simpleMap, 4, 4, 1.0, 10);
      expect(eastHit.side).toBe('west');
      
      // Test west wall
      const westHit = RaycastMath.castRay(origin, Math.PI, simpleMap, 4, 4, 1.0, 10);
      expect(westHit.side).toBe('east');
      
      // Test north wall
      const northHit = RaycastMath.castRay(origin, -Math.PI / 2, simpleMap, 4, 4, 1.0, 10);
      expect(northHit.side).toBe('south');
      
      // Test south wall
      const southHit = RaycastMath.castRay(origin, Math.PI / 2, simpleMap, 4, 4, 1.0, 10);
      expect(southHit.side).toBe('north');
    });

    it('should respect maximum render distance', () => {
      const longMap = Array(20).fill(null).map(() => Array(20).fill(0));
      // Create empty map (no walls)

      const origin = { x: 10, y: 10 };
      const angle = 0;
      const shortDistance = 5;
      const hit = RaycastMath.castRay(origin, angle, longMap, 20, 20, 1.0, shortDistance);

      expect(hit.distance).toBe(shortDistance);
      expect(hit.wallType).toBe(0);
    });

    it('should handle map boundaries correctly', () => {
      const origin = { x: 0.5, y: 0.5 };
      const angle = Math.PI; // Looking west (towards boundary)
      const hit = RaycastMath.castRay(origin, angle, simpleMap, 4, 4, 1.0, 10);

      // Should not crash and should return reasonable values
      expect(hit.distance).toBeGreaterThan(0);
    });
  });

  describe('calculateBillboard', () => {
    const camera: RaycastCamera = {
      position: { x: 0, y: 0 },
      rotation: 0,
      height: 0.5,
      pitch: 0
    };

    const viewport = { width: 800, height: 600 };
    const fov = Math.PI / 3; // 60 degrees

    it('should calculate billboard position correctly', () => {
      const billboard: Billboard = {
        position: { x: 0, y: 5 },
        texture: 'test',
        scale: 1.0
      };

      const result = RaycastMath.calculateBillboard(billboard, camera, viewport, fov);

      expect(result.distance).toBeCloseTo(5, 2);
      expect(result.screenX).toBeCloseTo(400, 1); // Center of screen
      expect(result.visible).toBe(true);
    });

    it('should mark billboards behind camera as invisible', () => {
      const billboard: Billboard = {
        position: { x: 0, y: -1 },
        texture: 'test',
        scale: 1.0
      };

      const result = RaycastMath.calculateBillboard(billboard, camera, viewport, fov);

      expect(result.visible).toBe(false);
    });

    it('should calculate correct screen size based on distance', () => {
      const nearBillboard: Billboard = {
        position: { x: 0, y: 2 },
        texture: 'test',
        scale: 1.0
      };

      const farBillboard: Billboard = {
        position: { x: 0, y: 10 },
        texture: 'test',
        scale: 1.0
      };

      const nearResult = RaycastMath.calculateBillboard(nearBillboard, camera, viewport, fov);
      const farResult = RaycastMath.calculateBillboard(farBillboard, camera, viewport, fov);

      expect(nearResult.screenSize).toBeGreaterThan(farResult.screenSize);
    });

    it('should handle camera rotation correctly', () => {
      const rotatedCamera: RaycastCamera = {
        ...camera,
        rotation: Math.PI / 2 // 90 degrees
      };

      const billboard: Billboard = {
        position: { x: 0, y: 5 }, // In front of rotated camera
        texture: 'test',
        scale: 1.0
      };

      const result = RaycastMath.calculateBillboard(billboard, rotatedCamera, viewport, fov);

      // Just check that it doesn't crash and produces reasonable values
      expect(result.distance).toBeCloseTo(5, 1);
      expect(result.screenX).toBeGreaterThan(-1000);
      expect(result.screenX).toBeLessThan(2000);
    });

    it('should mark off-screen billboards as invisible', () => {
      const billboard: Billboard = {
        position: { x: 100, y: 1 }, // Far to the right
        texture: 'test',
        scale: 1.0
      };

      const result = RaycastMath.calculateBillboard(billboard, camera, viewport, fov);

      expect(result.visible).toBe(false);
    });
  });

  describe('createDefaultCamera', () => {
    it('should create a valid default camera', () => {
      const camera = RaycastMath.createDefaultCamera();

      expect(camera.position.x).toBe(1.5);
      expect(camera.position.y).toBe(1.5);
      expect(camera.rotation).toBe(0);
      expect(camera.height).toBe(0.5);
      expect(camera.pitch).toBe(0);
    });
  });
});

describe('RaycastRenderModule', () => {
  let module: RaycastRenderModule;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    module = new RaycastRenderModule();
    
    // Create mock canvas and context
    mockCanvas = {
      width: 800,
      height: 600,
      getContext: () => mockContext
    } as any;

    mockContext = {
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
      globalAlpha: 1
    } as any;
  });

  describe('render', () => {
    it('should handle valid RaycastMap node', () => {
      const node: RaycastMapNode = {
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

      // Should not throw
      expect(() => module.render(node, context)).not.toThrow();
      
      // Should have called fillRect for sky and ground
      expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 800, 300); // Sky
      expect(mockContext.fillRect).toHaveBeenCalledWith(0, 300, 800, 300); // Ground
    });

    it('should warn for invalid node data', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const invalidNode = {
        id: 'invalid',
        type: 'RaycastMap',
        // Missing required map data
      } as any;

      const context = {
        canvas: mockCanvas,
        ctx: mockContext,
        viewport: { width: 800, height: 600 }
      } as any;

      module.render(invalidNode, context);

      expect(consoleSpy).toHaveBeenCalledWith('RaycastMap node missing required data');
      consoleSpy.mockRestore();
    });
  });

  describe('module properties', () => {
    it('should have correct module properties', () => {
      expect(module.name).toBe('raycast');
      expect(module.nodeTypes).toEqual(['RaycastMap']);
    });
  });
});

describe('Performance Tests', () => {
  it('should cast rays efficiently for full screen', () => {
    const map = Array(50).fill(null).map(() => Array(50).fill(0));
    // Add some walls
    for (let i = 0; i < 50; i++) {
      map[0][i] = 1;
      map[49][i] = 1;
      map[i][0] = 1;
      map[i][49] = 1;
    }

    const origin = { x: 25, y: 25 };
    const screenWidth = 800;
    
    const startTime = performance.now();
    
    for (let x = 0; x < screenWidth; x++) {
      const angle = (x - screenWidth / 2) / screenWidth * Math.PI / 3;
      RaycastMath.castRay(origin, angle, map, 50, 50, 1.0, 20);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Should complete within reasonable time (less than 16ms for 60fps)
    expect(duration).toBeLessThan(16);
  });

  it('should handle many billboards efficiently', () => {
    const camera: RaycastCamera = {
      position: { x: 0, y: 0 },
      rotation: 0,
      height: 0.5,
      pitch: 0
    };

    const viewport = { width: 800, height: 600 };
    const fov = Math.PI / 3;

    // Create many billboards
    const billboards: Billboard[] = [];
    for (let i = 0; i < 100; i++) {
      billboards.push({
        position: { x: Math.random() * 20 - 10, y: Math.random() * 20 - 10 },
        texture: 'test',
        scale: 1.0
      });
    }

    const startTime = performance.now();
    
    billboards.forEach(billboard => {
      RaycastMath.calculateBillboard(billboard, camera, viewport, fov);
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Should handle 100 billboards quickly
    expect(duration).toBeLessThan(5);
  });
});

describe('Edge Cases', () => {
  it('should handle zero-sized maps gracefully', () => {
    const emptyMap: number[][] = [];
    const origin = { x: 0, y: 0 };
    const angle = 0;
    
    const hit = RaycastMath.castRay(origin, angle, emptyMap, 0, 0, 1.0, 10);
    
    expect(hit.wallType).toBe(0);
    expect(hit.distance).toBe(10);
  });

  it('should handle extreme angles correctly', () => {
    const map = [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1]
    ];
    
    const origin = { x: 1.5, y: 1.5 };
    
    // Test very small angle
    const smallAngleHit = RaycastMath.castRay(origin, 0.001, map, 3, 3, 1.0, 10);
    expect(smallAngleHit.wallType).toBeGreaterThan(0);
    
    // Test angle close to PI/2
    const largeAngleHit = RaycastMath.castRay(origin, Math.PI / 2 - 0.001, map, 3, 3, 1.0, 10);
    expect(largeAngleHit.wallType).toBeGreaterThan(0);
  });

  it('should handle billboards at camera position', () => {
    const camera: RaycastCamera = {
      position: { x: 5, y: 5 },
      rotation: 0,
      height: 0.5,
      pitch: 0
    };

    const billboard: Billboard = {
      position: { x: 5, y: 5 }, // Same as camera
      texture: 'test',
      scale: 1.0
    };

    const viewport = { width: 800, height: 600 };
    const fov = Math.PI / 3;

    const result = RaycastMath.calculateBillboard(billboard, camera, viewport, fov);
    
    // Should handle gracefully without crashing
    expect(result.visible).toBe(false); // Should be invisible due to zero distance
  });
});