/**
 * Tests for the Action System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActionSystem, ActionContext } from './action-system.js';
import { Action, Condition } from '../types/actions.js';
import { Node, LGFCartridge, Transform2D } from '../types/core.js';
import { GameLoop } from './game-loop.js';

// Mock implementations
const createMockNode = (id: string): Node => ({
  id,
  type: 'Group',
  transform: {
    position: { x: 0, y: 0 },
    scale: { x: 1, y: 1 },
    rotation: 0,
    skew: { x: 0, y: 0 },
    alpha: 1
  } as Transform2D,
  visible: true,
  children: [],
  actions: [],
  triggers: [],
  addChild: vi.fn(),
  removeChild: vi.fn(),
  removeFromParent: vi.fn(),
  getRoot: vi.fn(),
  getDepth: vi.fn(),
  getWorldTransform: vi.fn(),
  isWorldVisible: vi.fn()
});

const createMockGameLoop = (): GameLoop => ({
  tickRate: 60,
  tickInterval: 16.67,
  tickCount: 0,
  frameCount: 0,
  isRunning: false,
  isPaused: false,
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getMetrics: vi.fn(),
  getRNG: vi.fn(() => ({
    seed: vi.fn(),
    random: vi.fn(() => 0.5),
    randomInt: vi.fn((min: number, max: number) => Math.floor(min + (max - min) * 0.5)),
    randomFloat: vi.fn((min: number, max: number) => min + (max - min) * 0.5)
  })),
  seedRNG: vi.fn()
});

const createMockCartridge = (): LGFCartridge => ({
  version: '1.0',
  metadata: {
    title: 'Test Game',
    author: 'Test Author',
    description: 'Test Description'
  },
  theme: {
    colors: {
      primary: '#000000',
      secondary: '#ffffff',
      background: '#cccccc',
      text: '#000000',
      accent: '#ff0000'
    },
    font: {
      family: 'Arial',
      sizes: { small: 12, medium: 16, large: 24 }
    },
    spacing: { small: 4, medium: 8, large: 16 },
    radii: { small: 2, medium: 4, large: 8 }
  },
  scenes: [],
  assets: {
    sprites: [],
    audio: [],
    fonts: []
  }
});

describe('ActionSystem', () => {
  let actionSystem: ActionSystem;
  let mockContext: ActionContext;
  let mockNode: Node;
  let mockGameLoop: GameLoop;
  let variables: Map<string, any>;

  beforeEach(() => {
    actionSystem = new ActionSystem();
    mockNode = createMockNode('test-node');
    mockGameLoop = createMockGameLoop();
    variables = new Map();
    
    mockContext = {
      node: mockNode,
      cartridge: createMockCartridge(),
      gameLoop: mockGameLoop,
      variables,
      currentScene: 'test-scene',
      sceneNodes: new Map([['test-node', mockNode]])
    };
  });

  describe('Condition Evaluation', () => {
    it('should evaluate equals condition correctly', async () => {
      variables.set('testVar', 42);
      
      const action: Action = {
        type: 'setVar',
        params: { variable: 'result', value: 'success' },
        conditions: [{ type: 'equals', variable: 'testVar', value: 42 }]
      };

      await actionSystem.executeAction(action, mockContext);
      expect(variables.get('result')).toBe('success');
    });

    it('should not execute action when condition fails', async () => {
      variables.set('testVar', 41);
      
      const action: Action = {
        type: 'setVar',
        params: { variable: 'result', value: 'success' },
        conditions: [{ type: 'equals', variable: 'testVar', value: 42 }]
      };

      await actionSystem.executeAction(action, mockContext);
      expect(variables.get('result')).toBeUndefined();
    });

    it('should evaluate greater condition correctly', async () => {
      variables.set('score', 100);
      
      const action: Action = {
        type: 'setVar',
        params: { variable: 'highScore', value: true },
        conditions: [{ type: 'greater', variable: 'score', value: 50 }]
      };

      await actionSystem.executeAction(action, mockContext);
      expect(variables.get('highScore')).toBe(true);
    });

    it('should evaluate less condition correctly', async () => {
      variables.set('health', 10);
      
      const action: Action = {
        type: 'setVar',
        params: { variable: 'lowHealth', value: true },
        conditions: [{ type: 'less', variable: 'health', value: 20 }]
      };

      await actionSystem.executeAction(action, mockContext);
      expect(variables.get('lowHealth')).toBe(true);
    });

    it('should evaluate exists condition correctly', async () => {
      variables.set('player', { name: 'test' });
      
      const action: Action = {
        type: 'setVar',
        params: { variable: 'hasPlayer', value: true },
        conditions: [{ type: 'exists', variable: 'player' }]
      };

      await actionSystem.executeAction(action, mockContext);
      expect(variables.get('hasPlayer')).toBe(true);
    });
  });

  describe('Core Actions', () => {
    it('should execute setVar action', async () => {
      const action: Action = {
        type: 'setVar',
        params: { variable: 'testVar', value: 'testValue' }
      };

      await actionSystem.executeAction(action, mockContext);
      expect(variables.get('testVar')).toBe('testValue');
    });

    it('should execute incVar action', async () => {
      variables.set('counter', 5);
      
      const action: Action = {
        type: 'incVar',
        params: { variable: 'counter', amount: 3 }
      };

      await actionSystem.executeAction(action, mockContext);
      expect(variables.get('counter')).toBe(8);
    });

    it('should execute incVar with default amount', async () => {
      variables.set('counter', 5);
      
      const action: Action = {
        type: 'incVar',
        params: { variable: 'counter' }
      };

      await actionSystem.executeAction(action, mockContext);
      expect(variables.get('counter')).toBe(6);
    });

    it('should execute randomInt action', async () => {
      const action: Action = {
        type: 'randomInt',
        params: { variable: 'randomValue', min: 10, max: 20 }
      };

      await actionSystem.executeAction(action, mockContext);
      const result = variables.get('randomValue');
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(10);
      expect(result).toBeLessThanOrEqual(20);
    });

    it('should execute gotoScene action', async () => {
      const action: Action = {
        type: 'gotoScene',
        params: { scene: 'newScene' }
      };

      await actionSystem.executeAction(action, mockContext);
      expect(variables.get('__nextScene')).toBe('newScene');
    });

    it('should execute despawn action', async () => {
      const targetNode = createMockNode('target');
      mockContext.sceneNodes.set('target', targetNode);
      
      const action: Action = {
        type: 'despawn',
        params: { node: 'target' }
      };

      await actionSystem.executeAction(action, mockContext);
      expect(targetNode.removeFromParent).toHaveBeenCalled();
      expect(mockContext.sceneNodes.has('target')).toBe(false);
    });
  });

  describe('If Action', () => {
    it('should execute then actions when condition is true', async () => {
      variables.set('testVar', 42);
      
      const action: Action = {
        type: 'if',
        params: {
          condition: { type: 'equals', variable: 'testVar', value: 42 },
          then: [{ type: 'setVar', params: { variable: 'result', value: 'then' } }],
          else: [{ type: 'setVar', params: { variable: 'result', value: 'else' } }]
        }
      };

      await actionSystem.executeAction(action, mockContext);
      expect(variables.get('result')).toBe('then');
    });

    it('should execute else actions when condition is false', async () => {
      variables.set('testVar', 41);
      
      const action: Action = {
        type: 'if',
        params: {
          condition: { type: 'equals', variable: 'testVar', value: 42 },
          then: [{ type: 'setVar', params: { variable: 'result', value: 'then' } }],
          else: [{ type: 'setVar', params: { variable: 'result', value: 'else' } }]
        }
      };

      await actionSystem.executeAction(action, mockContext);
      expect(variables.get('result')).toBe('else');
    });
  });

  describe('Tween System', () => {
    it('should create tween for numeric property', async () => {
      const target = { x: 0 };
      
      const action: Action = {
        type: 'tween',
        params: {
          target,
          property: 'x',
          to: 100,
          duration: 1000,
          easing: 'linear'
        }
      };

      await actionSystem.executeAction(action, mockContext);
      
      // Simulate time passing
      actionSystem.update(500); // Half duration
      expect(target.x).toBeCloseTo(50, 1);
      
      actionSystem.update(500); // Full duration
      expect(target.x).toBeCloseTo(100, 1);
    });

    it('should handle nested property paths', async () => {
      const target = { transform: { position: { x: 0 } } };
      
      const action: Action = {
        type: 'tween',
        params: {
          target,
          property: 'transform.position.x',
          to: 50,
          duration: 1000
        }
      };

      await actionSystem.executeAction(action, mockContext);
      actionSystem.update(1000);
      expect(target.transform.position.x).toBeCloseTo(50, 1);
    });
  });

  describe('Timer System', () => {
    it('should execute timer actions after duration', async () => {
      const startAction: Action = {
        type: 'startTimer',
        params: {
          id: 'test-timer',
          duration: 1000,
          actions: [{ type: 'setVar', params: { variable: 'timerFired', value: true } }]
        }
      };

      await actionSystem.executeAction(startAction, mockContext);
      
      // Timer should not have fired yet
      expect(variables.get('timerFired')).toBeUndefined();
      
      // Simulate time passing
      actionSystem.update(1000);
      expect(variables.get('timerFired')).toBe(true);
    });

    it('should stop timer before it fires', async () => {
      const startAction: Action = {
        type: 'startTimer',
        params: {
          id: 'test-timer',
          duration: 1000,
          actions: [{ type: 'setVar', params: { variable: 'timerFired', value: true } }]
        }
      };

      const stopAction: Action = {
        type: 'stopTimer',
        params: { id: 'test-timer' }
      };

      await actionSystem.executeAction(startAction, mockContext);
      await actionSystem.executeAction(stopAction, mockContext);
      
      actionSystem.update(1000);
      expect(variables.get('timerFired')).toBeUndefined();
    });
  });

  describe('Easing Functions', () => {
    it('should apply different easing functions correctly', async () => {
      const linearTarget = { x: 0 };
      const easeInTarget = { x: 0 };
      
      const linearAction: Action = {
        type: 'tween',
        params: { target: linearTarget, property: 'x', to: 100, duration: 1000, easing: 'linear' }
      };
      
      const easeInAction: Action = {
        type: 'tween',
        params: { target: easeInTarget, property: 'x', to: 100, duration: 1000, easing: 'easeIn' }
      };

      await actionSystem.executeAction(linearAction, mockContext);
      await actionSystem.executeAction(easeInAction, mockContext);
      
      // At 50% progress
      actionSystem.update(500);
      
      expect(linearTarget.x).toBeCloseTo(50, 1);
      expect(easeInTarget.x).toBeLessThan(50); // easeIn should be slower at start
    });
  });
});