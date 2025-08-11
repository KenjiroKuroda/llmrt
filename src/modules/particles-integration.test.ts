/**
 * Integration tests for the particles system module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerParticlesModule, ParticlesRenderModule } from './particles.js';
import { ModuleRegistry } from '../core/module-registry.js';
import { Particles2DNode } from '../types/modules.js';

describe('Particles Integration', () => {
  let moduleRegistry: ModuleRegistry;

  beforeEach(() => {
    // Get fresh module registry instance
    moduleRegistry = ModuleRegistry.getInstance();
    
    // Clear any existing registrations
    (moduleRegistry as any).modules.clear();
    (moduleRegistry as any).renderModules.clear();
    (moduleRegistry as any).actionHandlers.clear();
  });

  describe('module registration', () => {
    it('should register particles module successfully', () => {
      expect(() => {
        registerParticlesModule();
      }).not.toThrow();
    });

    it('should register module definition', () => {
      registerParticlesModule();
      
      const modules = moduleRegistry.getRegisteredModules();
      const particlesModule = modules.find(m => m.name === 'particles');
      
      expect(particlesModule).toBeDefined();
      expect(particlesModule?.nodeTypes).toContain('Particles2D');
      expect(particlesModule?.actions).toContain('startEmit');
      expect(particlesModule?.actions).toContain('stopEmit');
      expect(particlesModule?.actions).toContain('burstEmit');
    });

    it('should register render module', () => {
      registerParticlesModule();
      
      const renderModules = moduleRegistry.getRenderModules();
      const particlesRenderModule = renderModules.find(m => m.name === 'particles');
      
      expect(particlesRenderModule).toBeDefined();
      expect(particlesRenderModule?.nodeTypes).toContain('Particles2D');
    });

    it('should register action handlers', () => {
      registerParticlesModule();
      
      // Check that action handlers are registered
      const actionHandlers = (moduleRegistry as any).actionHandlers;
      expect(actionHandlers.has('startEmit')).toBe(true);
      expect(actionHandlers.has('stopEmit')).toBe(true);
      expect(actionHandlers.has('burstEmit')).toBe(true);
    });
  });

  describe('node creation and validation', () => {
    it('should create valid Particles2D node structure', () => {
      const particlesNode: Particles2DNode = {
        id: 'test-particles',
        type: 'Particles2D',
        transform: {
          position: { x: 100, y: 200 },
          scale: { x: 1, y: 1 },
          rotation: 0,
          skew: { x: 0, y: 0 },
          alpha: 1
        },
        visible: true,
        children: [],
        actions: [],
        triggers: [],
        emitter: {
          position: { x: 0, y: 0 },
          rate: 30,
          lifetime: 2.0,
          lifetimeVariance: 0.5,
          velocity: { x: 0, y: -50 },
          velocityVariance: { x: 25, y: 10 },
          acceleration: { x: 0, y: 98 },
          scale: 1.0,
          scaleVariance: 0.3,
          rotation: 0,
          rotationSpeed: Math.PI,
          color: '#ffaa00',
          colorEnd: '#ff0000',
          alpha: 1.0,
          alphaEnd: 0.0,
          enabled: true
        },
        maxParticles: 200,
        texture: 'particle-texture',
        blendMode: 'additive',
        addChild: vi.fn(),
        removeChild: vi.fn(),
        removeFromParent: vi.fn(),
        getRoot: vi.fn(),
        getDepth: vi.fn(),
        getWorldTransform: vi.fn(),
        isWorldVisible: vi.fn()
      };

      // Validate node structure
      expect(particlesNode.type).toBe('Particles2D');
      expect(particlesNode.emitter).toBeDefined();
      expect(particlesNode.maxParticles).toBeGreaterThan(0);
      expect(particlesNode.emitter.rate).toBeGreaterThan(0);
      expect(particlesNode.emitter.lifetime).toBeGreaterThan(0);
    });

    it('should handle minimal Particles2D node configuration', () => {
      const minimalNode: Particles2DNode = {
        id: 'minimal-particles',
        type: 'Particles2D',
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
        emitter: {
          position: { x: 0, y: 0 },
          rate: 10,
          lifetime: 1.0,
          lifetimeVariance: 0,
          velocity: { x: 0, y: 0 },
          velocityVariance: { x: 0, y: 0 },
          acceleration: { x: 0, y: 0 },
          scale: 1.0,
          scaleVariance: 0,
          rotation: 0,
          rotationSpeed: 0,
          color: '#ffffff',
          alpha: 1.0,
          enabled: true
        },
        maxParticles: 100,
        addChild: vi.fn(),
        removeChild: vi.fn(),
        removeFromParent: vi.fn(),
        getRoot: vi.fn(),
        getDepth: vi.fn(),
        getWorldTransform: vi.fn(),
        isWorldVisible: vi.fn()
      };

      expect(minimalNode.type).toBe('Particles2D');
      expect(minimalNode.emitter.enabled).toBe(true);
    });
  });

  describe('action integration', () => {
    let renderModule: ParticlesRenderModule;

    beforeEach(() => {
      registerParticlesModule();
      renderModule = new ParticlesRenderModule();
    });

    it('should execute startEmit action through module registry', () => {
      const actionHandler = moduleRegistry.getActionHandler('startEmit');
      expect(actionHandler).toBeDefined();

      // Should not throw when executing action
      expect(() => {
        actionHandler!({ enabled: true }, { nodeId: 'test-node' });
      }).not.toThrow();
    });

    it('should execute stopEmit action through module registry', () => {
      const actionHandler = moduleRegistry.getActionHandler('stopEmit');
      expect(actionHandler).toBeDefined();

      // Should not throw when executing action
      expect(() => {
        actionHandler!({}, { nodeId: 'test-node' });
      }).not.toThrow();
    });

    it('should execute burstEmit action through module registry', () => {
      const actionHandler = moduleRegistry.getActionHandler('burstEmit');
      expect(actionHandler).toBeDefined();

      // Should not throw when executing action
      expect(() => {
        actionHandler!({ count: 20 }, { nodeId: 'test-node' });
      }).not.toThrow();
    });
  });

  describe('performance requirements', () => {
    let renderModule: ParticlesRenderModule;
    let mockCanvas: HTMLCanvasElement;
    let mockContext: CanvasRenderingContext2D;

    beforeEach(() => {
      registerParticlesModule();
      renderModule = new ParticlesRenderModule();

      // Mock canvas and context
      mockCanvas = {
        width: 800,
        height: 600,
        getContext: vi.fn()
      } as any;

      mockContext = {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
        drawImage: vi.fn(),
        fillStyle: '',
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        clearRect: vi.fn(),
        fillRect: vi.fn()
      } as any;
    });

    it('should handle 200 active particles within performance budget', () => {
      const particlesNode: Particles2DNode = {
        id: 'performance-test',
        type: 'Particles2D',
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
        emitter: {
          position: { x: 0, y: 0 },
          rate: 0, // We'll use burst emit for controlled testing
          lifetime: 10.0, // Long lifetime to keep particles alive
          lifetimeVariance: 0,
          velocity: { x: 0, y: 0 },
          velocityVariance: { x: 0, y: 0 },
          acceleration: { x: 0, y: 0 },
          scale: 1.0,
          scaleVariance: 0,
          rotation: 0,
          rotationSpeed: 0,
          color: '#ffffff',
          alpha: 1.0,
          enabled: false
        },
        maxParticles: 200,
        addChild: vi.fn(),
        removeChild: vi.fn(),
        removeFromParent: vi.fn(),
        getRoot: vi.fn(),
        getDepth: vi.fn(),
        getWorldTransform: vi.fn(),
        isWorldVisible: vi.fn()
      };

      const renderContext = {
        canvas: mockCanvas,
        ctx: mockContext,
        camera: { position: { x: 0, y: 0 }, zoom: 1, rotation: 0, target: { x: 0, y: 0 } },
        theme: {} as any,
        interpolation: 0,
        viewport: { width: 800, height: 600, scale: 1, offset: { x: 0, y: 0 } }
      };

      // Spawn 200 particles
      renderModule.handleAction('performance-test', 'burstEmit', { count: 200 });

      // Measure render time
      const startTime = performance.now();
      renderModule.render(particlesNode, renderContext);
      const endTime = performance.now();

      // Should complete within 60 FPS budget (16.67ms)
      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(16.67);
    });

    it('should maintain stable performance over multiple frames', () => {
      const particlesNode: Particles2DNode = {
        id: 'stability-test',
        type: 'Particles2D',
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
        emitter: {
          position: { x: 0, y: 0 },
          rate: 60, // High emission rate
          lifetime: 2.0,
          lifetimeVariance: 0,
          velocity: { x: 0, y: -100 },
          velocityVariance: { x: 50, y: 20 },
          acceleration: { x: 0, y: 98 },
          scale: 1.0,
          scaleVariance: 0.2,
          rotation: 0,
          rotationSpeed: Math.PI,
          color: '#ffffff',
          alpha: 1.0,
          enabled: true
        },
        maxParticles: 150,
        addChild: vi.fn(),
        removeChild: vi.fn(),
        removeFromParent: vi.fn(),
        getRoot: vi.fn(),
        getDepth: vi.fn(),
        getWorldTransform: vi.fn(),
        isWorldVisible: vi.fn()
      };

      const renderContext = {
        canvas: mockCanvas,
        ctx: mockContext,
        camera: { position: { x: 0, y: 0 }, zoom: 1, rotation: 0, target: { x: 0, y: 0 } },
        theme: {} as any,
        interpolation: 0,
        viewport: { width: 800, height: 600, scale: 1, offset: { x: 0, y: 0 } }
      };

      const frameTimes: number[] = [];

      // Simulate 60 frames (1 second at 60 FPS)
      for (let frame = 0; frame < 60; frame++) {
        const startTime = performance.now();
        renderModule.render(particlesNode, renderContext);
        const endTime = performance.now();
        
        frameTimes.push(endTime - startTime);
      }

      // Calculate average frame time
      const averageFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
      
      // Average should be well within budget
      expect(averageFrameTime).toBeLessThan(10); // Conservative target
      
      // No frame should exceed budget significantly
      const maxFrameTime = Math.max(...frameTimes);
      expect(maxFrameTime).toBeLessThan(20); // Allow some variance
    });
  });

  describe('memory management', () => {
    let renderModule: ParticlesRenderModule;

    beforeEach(() => {
      registerParticlesModule();
      renderModule = new ParticlesRenderModule();
    });

    it('should clean up particle systems when nodes are removed', () => {
      const nodeId = 'cleanup-test';
      
      // Create particle system by handling an action
      renderModule.handleAction(nodeId, 'startEmit', {});
      
      // Clean up
      renderModule.cleanup(nodeId);
      
      // Should not throw when trying to handle actions on cleaned up node
      expect(() => {
        renderModule.handleAction(nodeId, 'stopEmit', {});
      }).not.toThrow();
    });

    it('should handle multiple particle systems simultaneously', () => {
      const nodeIds = ['particles1', 'particles2', 'particles3'];
      
      // Create multiple particle systems
      nodeIds.forEach(nodeId => {
        renderModule.handleAction(nodeId, 'burstEmit', { count: 50 });
      });
      
      // All should work independently
      nodeIds.forEach(nodeId => {
        expect(() => {
          renderModule.handleAction(nodeId, 'stopEmit', {});
        }).not.toThrow();
      });
      
      // Clean up all
      nodeIds.forEach(nodeId => {
        renderModule.cleanup(nodeId);
      });
    });
  });
});