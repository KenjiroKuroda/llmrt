/**
 * Tests for the GameLoop class
 * Verifies timing accuracy, deterministic behavior, and performance monitoring
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameLoop, GameLoopCallbacks, PerformanceMetrics } from './game-loop.js';

// Mock performance.now for deterministic testing
const mockPerformanceNow = vi.fn();
vi.stubGlobal('performance', { now: mockPerformanceNow });

// Mock requestAnimationFrame and cancelAnimationFrame
const mockRequestAnimationFrame = vi.fn();
const mockCancelAnimationFrame = vi.fn();
vi.stubGlobal('requestAnimationFrame', mockRequestAnimationFrame);
vi.stubGlobal('cancelAnimationFrame', mockCancelAnimationFrame);

describe('GameLoop', () => {
  let gameLoop: GameLoop;
  let mockCallbacks: GameLoopCallbacks;
  let currentTime: number;

  beforeEach(() => {
    currentTime = 0;
    mockPerformanceNow.mockImplementation(() => currentTime);
    mockRequestAnimationFrame.mockImplementation((callback) => {
      // Simulate immediate execution for testing
      setTimeout(callback, 0);
      return 1;
    });
    mockCancelAnimationFrame.mockClear();

    mockCallbacks = {
      onTick: vi.fn(),
      onRender: vi.fn()
    };

    gameLoop = new GameLoop(mockCallbacks);
  });

  afterEach(() => {
    gameLoop.stop();
    vi.clearAllMocks();
  });

  describe('Basic Lifecycle', () => {
    it('should initialize with correct default values', () => {
      expect(gameLoop.tickRate).toBe(60);
      expect(gameLoop.tickInterval).toBe(1000 / 60);
      expect(gameLoop.isRunning).toBe(false);
      expect(gameLoop.isPaused).toBe(false);
      expect(gameLoop.tickCount).toBe(0);
      expect(gameLoop.frameCount).toBe(0);
    });

    it('should start and stop correctly', () => {
      expect(gameLoop.isRunning).toBe(false);
      
      gameLoop.start();
      expect(gameLoop.isRunning).toBe(true);
      expect(gameLoop.isPaused).toBe(false);
      
      gameLoop.stop();
      expect(gameLoop.isRunning).toBe(false);
      expect(mockCancelAnimationFrame).toHaveBeenCalled();
    });

    it('should pause and resume correctly', () => {
      gameLoop.start();
      expect(gameLoop.isPaused).toBe(false);
      
      gameLoop.pause();
      expect(gameLoop.isPaused).toBe(true);
      expect(gameLoop.isRunning).toBe(true);
      
      gameLoop.resume();
      expect(gameLoop.isPaused).toBe(false);
      expect(gameLoop.isRunning).toBe(true);
    });

    it('should not start if already running', () => {
      gameLoop.start();
      const initialTickCount = gameLoop.tickCount;
      
      gameLoop.start(); // Should be ignored
      expect(gameLoop.tickCount).toBe(initialTickCount);
    });
  });

  describe('Fixed Timestep Logic', () => {
    it('should execute ticks at 60Hz when running at 60 FPS', async () => {
      gameLoop.start();
      
      // Simulate 5 frames at exactly 60 FPS (16.67ms each)
      for (let i = 0; i < 5; i++) {
        currentTime += 16.67;
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      // Should have executed approximately 5 ticks
      expect(mockCallbacks.onTick).toHaveBeenCalledTimes(5);
      expect(gameLoop.tickCount).toBe(5);
    });

    it('should maintain 60Hz ticks even at 30 FPS', async () => {
      gameLoop.start();
      
      // Simulate 3 frames at 30 FPS (33.33ms each)
      for (let i = 0; i < 3; i++) {
        currentTime += 33.33;
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      // Should have executed approximately 6 ticks (2 per frame) to maintain 60Hz
      // Allow for some timing variance in the test
      expect(gameLoop.tickCount).toBeGreaterThanOrEqual(5);
      expect(gameLoop.tickCount).toBeLessThanOrEqual(6);
    });

    it('should drop frames when too far behind', async () => {
      gameLoop.start();
      
      // Simulate a massive frame time (200ms)
      currentTime += 200;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const metrics = gameLoop.getMetrics();
      expect(metrics.droppedFrames).toBeGreaterThan(0);
      
      // Should not execute more than 5 ticks in one frame
      expect(gameLoop.tickCount).toBeLessThanOrEqual(5);
    });

    it('should not execute ticks when paused', async () => {
      gameLoop.start();
      gameLoop.pause();
      
      const initialTickCount = gameLoop.tickCount;
      
      // Simulate time passing while paused
      currentTime += 100;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      expect(gameLoop.tickCount).toBe(initialTickCount);
      expect(mockCallbacks.onTick).not.toHaveBeenCalled();
    });
  });

  describe('Frame Interpolation', () => {
    it('should provide interpolation factor between 0 and 1', async () => {
      gameLoop.start();
      
      // Simulate a partial frame
      currentTime += 8.33; // Half a tick interval
      await new Promise(resolve => setTimeout(resolve, 1));
      
      expect(mockCallbacks.onRender).toHaveBeenCalled();
      const lastCall = mockCallbacks.onRender.mock.calls[mockCallbacks.onRender.mock.calls.length - 1];
      const interpolation = lastCall[0];
      
      expect(interpolation).toBeGreaterThanOrEqual(0);
      expect(interpolation).toBeLessThanOrEqual(1);
    });

    it('should provide 0 interpolation when paused', async () => {
      gameLoop.start();
      gameLoop.pause();
      
      currentTime += 16.67;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const lastCall = mockCallbacks.onRender.mock.calls[mockCallbacks.onRender.mock.calls.length - 1];
      const interpolation = lastCall[0];
      
      expect(interpolation).toBe(0);
    });

    it('should call render callback every frame', async () => {
      gameLoop.start();
      
      const initialRenderCalls = mockCallbacks.onRender.mock.calls.length;
      
      // Simulate 3 frames
      for (let i = 0; i < 3; i++) {
        currentTime += 16.67;
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      // Should have at least 3 additional render calls
      expect(mockCallbacks.onRender.mock.calls.length - initialRenderCalls).toBeGreaterThanOrEqual(3);
      expect(gameLoop.frameCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Performance Metrics', () => {
    it('should track performance metrics correctly', async () => {
      gameLoop.start();
      
      // Simulate some frames
      for (let i = 0; i < 10; i++) {
        currentTime += 16.67;
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      const metrics = gameLoop.getMetrics();
      
      expect(metrics.tickRate).toBe(60);
      expect(metrics.totalTicks).toBe(gameLoop.tickCount);
      expect(metrics.totalFrames).toBe(gameLoop.frameCount);
      expect(metrics.averageFrameTime).toBeGreaterThan(0);
      expect(metrics.droppedFrames).toBeGreaterThanOrEqual(0);
    });

    it('should calculate FPS correctly', async () => {
      gameLoop.start();
      
      // Simulate consistent 60 FPS frame times
      for (let i = 0; i < 60; i++) {
        currentTime += 16.67;
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      // Advance time by 1 second to trigger FPS calculation
      currentTime += 1000;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const metrics = gameLoop.getMetrics();
      // FPS calculation should be based on frame history
      expect(metrics.fps).toBeGreaterThan(0);
      expect(metrics.averageFrameTime).toBeGreaterThan(0);
    });
  });

  describe('Deterministic RNG', () => {
    it('should provide deterministic random numbers with same seed', () => {
      const gameLoop1 = new GameLoop();
      const gameLoop2 = new GameLoop();
      const rng1 = gameLoop1.getRNG();
      const rng2 = gameLoop2.getRNG();
      
      rng1.seed(12345);
      rng2.seed(12345);
      
      // Generate same sequence
      for (let i = 0; i < 10; i++) {
        expect(rng1.random()).toBe(rng2.random());
      }
    });

    it('should provide different sequences with different seeds', () => {
      const rng = gameLoop.getRNG();
      
      rng.seed(12345);
      const sequence1 = Array.from({ length: 10 }, () => rng.random());
      
      rng.seed(54321);
      const sequence2 = Array.from({ length: 10 }, () => rng.random());
      
      expect(sequence1).not.toEqual(sequence2);
    });

    it('should generate integers in correct range', () => {
      const rng = gameLoop.getRNG();
      rng.seed(12345);
      
      for (let i = 0; i < 100; i++) {
        const value = rng.randomInt(5, 10);
        expect(value).toBeGreaterThanOrEqual(5);
        expect(value).toBeLessThanOrEqual(10);
        expect(Number.isInteger(value)).toBe(true);
      }
    });

    it('should generate floats in correct range', () => {
      const rng = gameLoop.getRNG();
      rng.seed(12345);
      
      for (let i = 0; i < 100; i++) {
        const value = rng.randomFloat(1.5, 3.7);
        expect(value).toBeGreaterThanOrEqual(1.5);
        expect(value).toBeLessThan(3.7);
      }
    });

    it('should allow seeding through gameLoop method', () => {
      const rng = gameLoop.getRNG();
      
      gameLoop.seedRNG(99999);
      const value1 = rng.random();
      
      gameLoop.seedRNG(99999);
      const value2 = rng.random();
      
      expect(value1).toBe(value2);
    });
  });

  describe('Callback Management', () => {
    it('should allow setting callbacks after construction', async () => {
      const newCallbacks: GameLoopCallbacks = {
        onTick: vi.fn(),
        onRender: vi.fn()
      };
      
      gameLoop.setCallbacks(newCallbacks);
      gameLoop.start();
      
      currentTime += 16.67;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      expect(newCallbacks.onTick).toHaveBeenCalled();
      expect(newCallbacks.onRender).toHaveBeenCalled();
    });

    it('should handle missing callbacks gracefully', () => {
      const gameLoopWithoutCallbacks = new GameLoop();
      
      expect(() => {
        gameLoopWithoutCallbacks.start();
        currentTime += 16.67;
      }).not.toThrow();
    });

    it('should pass correct parameters to tick callback', async () => {
      gameLoop.start();
      
      currentTime += 16.67;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      expect(mockCallbacks.onTick).toHaveBeenCalledWith(
        expect.any(Number), // tick count
        gameLoop.tickInterval // delta time
      );
    });

    it('should pass correct parameters to render callback', async () => {
      gameLoop.start();
      
      currentTime += 16.67;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      expect(mockCallbacks.onRender).toHaveBeenCalledWith(
        expect.any(Number), // interpolation factor
        expect.any(Number)  // frame time
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero frame time', async () => {
      gameLoop.start();
      
      // Don't advance time
      await new Promise(resolve => setTimeout(resolve, 1));
      
      expect(() => gameLoop.getMetrics()).not.toThrow();
    });

    it('should handle negative seed values', () => {
      const rng = gameLoop.getRNG();
      
      expect(() => {
        rng.seed(-12345);
        rng.random();
      }).not.toThrow();
    });

    it('should handle resume without start', () => {
      expect(() => {
        gameLoop.resume();
      }).not.toThrow();
      
      expect(gameLoop.isRunning).toBe(false);
    });

    it('should handle multiple stops', () => {
      gameLoop.start();
      gameLoop.stop();
      
      expect(() => {
        gameLoop.stop();
      }).not.toThrow();
    });
  });
});