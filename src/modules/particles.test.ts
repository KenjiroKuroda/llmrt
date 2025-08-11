/**
 * Unit tests for the particles system module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ParticleSystem, ParticlesRenderModule, ParticlesModuleDefinition } from './particles.js';
import { ParticleEmitter, Particles2DNode, RenderContext } from '../types/modules.js';
import { Vector2 } from '../types/core.js';

describe('ParticleSystem', () => {
  let emitter: ParticleEmitter;
  let particleSystem: ParticleSystem;

  beforeEach(() => {
    emitter = {
      position: { x: 0, y: 0 },
      rate: 10, // 10 particles per second
      lifetime: 2.0,
      lifetimeVariance: 0.5,
      velocity: { x: 50, y: -100 },
      velocityVariance: { x: 20, y: 20 },
      acceleration: { x: 0, y: 98 }, // Gravity
      scale: 1.0,
      scaleVariance: 0.2,
      rotation: 0,
      rotationSpeed: Math.PI,
      color: '#ffffff',
      colorEnd: '#ff0000',
      alpha: 1.0,
      alphaEnd: 0.0,
      enabled: true
    };

    particleSystem = new ParticleSystem(emitter, 100);
  });

  describe('particle spawning', () => {
    it('should spawn particles at the correct rate', () => {
      // Update for 0.1 seconds (should spawn 1 particle at 10/sec rate)
      particleSystem.update(0.1);
      expect(particleSystem.getParticles()).toHaveLength(1);

      // Update for another 0.1 seconds (should spawn another particle)
      particleSystem.update(0.1);
      expect(particleSystem.getParticles()).toHaveLength(2);
    });

    it('should respect maximum particle count', () => {
      const smallSystem = new ParticleSystem(emitter, 2);
      
      // Update for 1 second (should try to spawn 10 particles but be limited to 2)
      smallSystem.update(1.0);
      expect(smallSystem.getParticles()).toHaveLength(2);
    });

    it('should not spawn particles when emitter is disabled', () => {
      emitter.enabled = false;
      particleSystem.update(1.0);
      expect(particleSystem.getParticles()).toHaveLength(0);
    });

    it('should spawn particles with variance in properties', () => {
      // Spawn multiple particles to test variance
      particleSystem.update(0.5); // Should spawn ~5 particles
      const particles = particleSystem.getParticles();
      
      expect(particles.length).toBeGreaterThan(0);
      
      // Check that particles have different lifetimes (due to variance)
      if (particles.length > 1) {
        const lifetimes = particles.map(p => p.maxLifetime);
        const uniqueLifetimes = new Set(lifetimes);
        expect(uniqueLifetimes.size).toBeGreaterThan(1);
      }
    });
  });

  describe('particle physics', () => {
    it('should update particle positions based on velocity', () => {
      particleSystem.update(0.1); // Spawn a particle
      const particles = particleSystem.getParticles();
      expect(particles).toHaveLength(1);

      const initialPosition = { ...particles[0].position };
      
      // Update physics
      particleSystem.update(0.1);
      
      // Position should have changed based on velocity
      expect(particles[0].position.x).not.toBe(initialPosition.x);
      expect(particles[0].position.y).not.toBe(initialPosition.y);
    });

    it('should apply acceleration to velocity', () => {
      particleSystem.update(0.1); // Spawn a particle
      const particles = particleSystem.getParticles();
      expect(particles).toHaveLength(1);

      const initialVelocity = { ...particles[0].velocity };
      
      // Update physics
      particleSystem.update(0.1);
      
      // Velocity should have changed based on acceleration
      expect(particles[0].velocity.y).toBeGreaterThan(initialVelocity.y); // Gravity effect
    });

    it('should update particle rotation', () => {
      particleSystem.update(0.1); // Spawn a particle
      const particles = particleSystem.getParticles();
      expect(particles).toHaveLength(1);

      const initialRotation = particles[0].rotation;
      
      // Update physics
      particleSystem.update(0.1);
      
      // Rotation should have changed
      expect(particles[0].rotation).not.toBe(initialRotation);
    });
  });

  describe('particle lifecycle', () => {
    it('should age particles over time', () => {
      particleSystem.update(0.1); // Spawn a particle
      const particles = particleSystem.getParticles();
      expect(particles).toHaveLength(1);
      expect(particles[0].age).toBe(0);

      // Update and check age
      particleSystem.update(0.5);
      expect(particles[0].age).toBeCloseTo(0.5, 2);
    });

    it('should remove particles when they exceed their lifetime', () => {
      // Set short lifetime for quick testing
      emitter.lifetime = 0.1;
      emitter.lifetimeVariance = 0;
      emitter.rate = 0; // No continuous emission
      emitter.enabled = false; // Disable emitter
      
      // Create new particle system with updated emitter
      particleSystem = new ParticleSystem(emitter, 100);
      
      // Spawn a single particle using burst
      particleSystem.burstEmit(1);
      expect(particleSystem.getParticles()).toHaveLength(1);

      // Update past lifetime
      particleSystem.update(0.2);
      expect(particleSystem.getParticles()).toHaveLength(0);
    });

    it('should interpolate alpha over lifetime when alphaEnd is set', () => {
      particleSystem.update(0.1); // Spawn a particle
      const particles = particleSystem.getParticles();
      expect(particles).toHaveLength(1);

      const particle = particles[0];
      expect(particle.alpha).toBe(1.0); // Initial alpha

      // Age the particle to halfway through its lifetime
      particle.age = particle.maxLifetime / 2;
      particleSystem.update(0.01); // Small update to trigger interpolation

      // Alpha should be interpolated (somewhere between 1.0 and 0.0)
      expect(particle.alpha).toBeLessThan(1.0);
      expect(particle.alpha).toBeGreaterThan(0.0);
    });
  });

  describe('emitter control', () => {
    it('should start emitting when startEmit is called', () => {
      emitter.enabled = false;
      particleSystem.stopEmit();
      particleSystem.update(0.1);
      expect(particleSystem.getParticles()).toHaveLength(0);

      particleSystem.startEmit();
      particleSystem.update(0.1);
      expect(particleSystem.getParticles().length).toBeGreaterThan(0);
    });

    it('should stop emitting when stopEmit is called', () => {
      particleSystem.startEmit();
      particleSystem.update(0.1);
      const initialCount = particleSystem.getParticles().length;
      expect(initialCount).toBeGreaterThan(0);

      particleSystem.stopEmit();
      particleSystem.update(0.1);
      
      // Should not spawn new particles, but existing ones should remain
      expect(particleSystem.getParticles().length).toBe(initialCount);
    });

    it('should emit burst of particles when burstEmit is called', () => {
      particleSystem.burstEmit(5);
      expect(particleSystem.getParticles()).toHaveLength(5);
    });

    it('should clear all particles when clear is called', () => {
      particleSystem.update(0.5); // Spawn some particles
      expect(particleSystem.getParticles().length).toBeGreaterThan(0);

      particleSystem.clear();
      expect(particleSystem.getParticles()).toHaveLength(0);
    });
  });

  describe('performance', () => {
    it('should handle large numbers of particles efficiently', () => {
      const largeSystem = new ParticleSystem(emitter, 1000);
      
      // Spawn maximum particles
      largeSystem.burstEmit(1000);
      expect(largeSystem.getParticles()).toHaveLength(1000);

      // Update should complete in reasonable time
      const startTime = performance.now();
      largeSystem.update(0.016); // 60 FPS frame time
      const endTime = performance.now();
      
      // Should complete in less than 16ms (60 FPS budget)
      expect(endTime - startTime).toBeLessThan(16);
    });

    it('should maintain particle count under maximum', () => {
      const system = new ParticleSystem(emitter, 50);
      
      // Try to spawn more than maximum
      system.burstEmit(100);
      expect(system.getParticles()).toHaveLength(50);
      
      // Continue updating - should never exceed maximum
      for (let i = 0; i < 10; i++) {
        system.update(0.1);
        expect(system.getParticles().length).toBeLessThanOrEqual(50);
      }
    });
  });
});

describe('ParticlesRenderModule', () => {
  let renderModule: ParticlesRenderModule;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;
  let renderContext: RenderContext;

  beforeEach(() => {
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
      fill: vi.fn()
    } as any;

    renderContext = {
      canvas: mockCanvas,
      ctx: mockContext,
      camera: { position: { x: 0, y: 0 }, zoom: 1, rotation: 0, target: { x: 0, y: 0 } },
      theme: {} as any,
      interpolation: 0,
      viewport: { width: 800, height: 600, scale: 1, offset: { x: 0, y: 0 } }
    };
  });

  describe('module properties', () => {
    it('should have correct module properties', () => {
      expect(renderModule.name).toBe('particles');
      expect(renderModule.nodeTypes).toContain('Particles2D');
    });
  });

  describe('rendering', () => {
    it('should create particle system for new nodes', () => {
      const particlesNode: Particles2DNode = {
        id: 'test-particles',
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

      // Should not throw when rendering
      expect(() => {
        renderModule.render(particlesNode, renderContext);
      }).not.toThrow();
    });

    it('should handle different blend modes', () => {
      const particlesNode: Particles2DNode = {
        id: 'test-particles',
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
          rate: 0, // No emission for this test
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
          enabled: false
        },
        maxParticles: 100,
        blendMode: 'additive',
        addChild: vi.fn(),
        removeChild: vi.fn(),
        removeFromParent: vi.fn(),
        getRoot: vi.fn(),
        getDepth: vi.fn(),
        getWorldTransform: vi.fn(),
        isWorldVisible: vi.fn()
      };

      renderModule.render(particlesNode, renderContext);
      
      // Should set blend mode and restore it
      expect(mockContext.globalCompositeOperation).toBe('source-over'); // Restored
    });
  });

  describe('action handling', () => {
    it('should handle startEmit action', () => {
      const nodeId = 'test-particles';
      
      // Should not throw
      expect(() => {
        renderModule.handleAction(nodeId, 'startEmit', {});
      }).not.toThrow();
    });

    it('should handle stopEmit action', () => {
      const nodeId = 'test-particles';
      
      // Should not throw
      expect(() => {
        renderModule.handleAction(nodeId, 'stopEmit', {});
      }).not.toThrow();
    });

    it('should handle burstEmit action', () => {
      const nodeId = 'test-particles';
      
      // Should not throw
      expect(() => {
        renderModule.handleAction(nodeId, 'burstEmit', { count: 10 });
      }).not.toThrow();
    });

    it('should warn for unknown actions', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const nodeId = 'test-particles';
      
      // First create a particle system by calling a valid action
      renderModule.handleAction(nodeId, 'startEmit', {});
      
      // Then call unknown action
      renderModule.handleAction(nodeId, 'unknownAction', {});
      
      expect(consoleSpy).toHaveBeenCalledWith('Unknown particle action: unknownAction');
      consoleSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('should clean up particle systems', () => {
      const nodeId = 'test-particles';
      
      // Should not throw
      expect(() => {
        renderModule.cleanup(nodeId);
      }).not.toThrow();
    });
  });
});

describe('ParticlesModuleDefinition', () => {
  it('should have correct module definition', () => {
    expect(ParticlesModuleDefinition.name).toBe('particles');
    expect(ParticlesModuleDefinition.nodeTypes).toContain('Particles2D');
    expect(ParticlesModuleDefinition.actions).toContain('startEmit');
    expect(ParticlesModuleDefinition.actions).toContain('stopEmit');
    expect(ParticlesModuleDefinition.actions).toContain('burstEmit');
    expect(ParticlesModuleDefinition.size).toBeGreaterThan(0);
  });
});