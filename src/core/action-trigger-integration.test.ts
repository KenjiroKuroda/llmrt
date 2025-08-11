/**
 * Integration tests for Action and Trigger systems working together
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActionSystem, ActionContext } from './action-system.js';
import { TriggerSystem, InputEvent } from './trigger-system.js';
import { Node, Transform2D, LGFCartridge } from '../types/core.js';
import { Trigger, Action } from '../types/actions.js';
import { GameLoop } from './game-loop.js';

// Mock implementations
const createMockNode = (id: string, triggers: Trigger[] = []): Node => ({
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
  triggers,
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

describe('Action and Trigger System Integration', () => {
  let actionSystem: ActionSystem;
  let triggerSystem: TriggerSystem;
  let mockContext: ActionContext;
  let variables: Map<string, any>;

  beforeEach(() => {
    actionSystem = new ActionSystem();
    triggerSystem = new TriggerSystem(actionSystem);
    variables = new Map();
    
    mockContext = {
      node: createMockNode('test'),
      cartridge: createMockCartridge(),
      gameLoop: createMockGameLoop(),
      variables,
      currentScene: 'test-scene',
      sceneNodes: new Map()
    };
  });

  describe('Game Loop Integration', () => {
    it('should handle complete game tick cycle with triggers and actions', () => {
      // Create a node that increments a counter on each tick
      const tickTrigger: Trigger = {
        event: 'on.tick',
        actions: [
          { type: 'incVar', params: { variable: 'tickCount', amount: 1 } }
        ]
      };

      const node = createMockNode('counter-node', [tickTrigger]);
      triggerSystem.registerNode(node, mockContext);
      
      // Initialize counter
      variables.set('tickCount', 0);

      // Simulate several ticks
      for (let i = 0; i < 5; i++) {
        triggerSystem.processTick(mockContext);
        actionSystem.update(16.67); // ~60 FPS
      }

      expect(variables.get('tickCount')).toBe(5);
    });

    it('should handle timer-based actions triggered by game ticks', () => {
      // Create a node that starts a timer on start, which then sets a variable
      const startTrigger: Trigger = {
        event: 'on.start',
        actions: [
          {
            type: 'startTimer',
            params: {
              id: 'test-timer',
              duration: 1000,
              actions: [
                { type: 'setVar', params: { variable: 'timerComplete', value: true } }
              ]
            }
          }
        ]
      };

      const timerTrigger: Trigger = {
        event: 'on.timer',
        actions: [
          { type: 'setVar', params: { variable: 'timerFired', value: true } }
        ]
      };

      const node = createMockNode('timer-node', [startTrigger, timerTrigger]);
      triggerSystem.registerNode(node, mockContext);

      // Timer should not have fired yet
      expect(variables.get('timerComplete')).toBeUndefined();
      expect(variables.get('timerFired')).toBeUndefined();

      // Simulate time passing - ActionSystem handles the timer actions
      actionSystem.update(1000);
      
      // The timer action should have fired
      expect(variables.get('timerComplete')).toBe(true);
      
      // The trigger system timer is separate - let's test it separately
      triggerSystem.startTimer('trigger-timer', 1000);
      triggerSystem.processTimers(mockContext, 1000);
      expect(variables.get('timerFired')).toBe(true);
    });
  });

  describe('Input-Driven Actions', () => {
    it('should handle key input triggering complex action chains', () => {
      // Create a node that responds to space key with conditional logic
      const keyTrigger: Trigger = {
        event: 'on.key',
        actions: [
          {
            type: 'if',
            params: {
              condition: { type: 'less', variable: 'score', value: 100 },
              then: [
                { type: 'incVar', params: { variable: 'score', amount: 10 } },
                { type: 'setVar', params: { variable: 'lastAction', value: 'scored' } }
              ],
              else: [
                { type: 'setVar', params: { variable: 'lastAction', value: 'maxScore' } }
              ]
            }
          }
        ]
      };

      const node = createMockNode('player-node', [keyTrigger]);
      node.transform.position = { x: 0, y: 0 }; // Position for hit testing
      triggerSystem.registerNode(node, mockContext);

      // Initialize score
      variables.set('score', 50);

      // Simulate space key press
      const keyEvent: InputEvent = {
        type: 'key',
        key: 'space',
        pressed: true
      };

      triggerSystem.handleInput(keyEvent, mockContext);

      expect(variables.get('score')).toBe(60);
      expect(variables.get('lastAction')).toBe('scored');

      // Test max score condition - need to release and press key again
      variables.set('score', 150);
      
      // Release key first
      triggerSystem.handleInput({
        type: 'key',
        key: 'space',
        pressed: false
      }, mockContext);
      
      // Then press again
      triggerSystem.handleInput(keyEvent, mockContext);

      expect(variables.get('score')).toBe(150); // Should not increase
      expect(variables.get('lastAction')).toBe('maxScore');
    });

    it('should handle pointer input with position-based logic', () => {
      const pointerTrigger: Trigger = {
        event: 'on.pointer',
        actions: [
          { type: 'setVar', params: { variable: 'clicked', value: true } },
          { type: 'incVar', params: { variable: 'clickCount', amount: 1 } }
        ]
      };

      const node = createMockNode('button-node', [pointerTrigger]);
      node.transform.position = { x: 10, y: 10 };
      triggerSystem.registerNode(node, mockContext);

      variables.set('clickCount', 0);

      // Click near the node
      const pointerEvent: InputEvent = {
        type: 'pointer',
        button: 0,
        position: { x: 15, y: 15 },
        pressed: true
      };

      triggerSystem.handleInput(pointerEvent, mockContext);

      expect(variables.get('clicked')).toBe(true);
      expect(variables.get('clickCount')).toBe(1);
    });
  });

  describe('Tween Integration', () => {
    it('should handle tweens triggered by user input', () => {
      const keyTrigger: Trigger = {
        event: 'on.key',
        actions: [
          {
            type: 'tween',
            params: {
              property: 'transform.position.x',
              to: 100,
              duration: 1000,
              easing: 'linear'
            }
          }
        ]
      };

      const node = createMockNode('moving-node', [keyTrigger]);
      node.transform.position = { x: 0, y: 0 };
      triggerSystem.registerNode(node, mockContext);

      // Trigger tween with key press
      const keyEvent: InputEvent = {
        type: 'key',
        key: 'right',
        pressed: true
      };

      triggerSystem.handleInput(keyEvent, mockContext);

      // Simulate tween progress
      actionSystem.update(500); // Half duration
      expect(node.transform.position.x).toBeCloseTo(50, 1);

      actionSystem.update(500); // Full duration
      expect(node.transform.position.x).toBeCloseTo(100, 1);
    });
  });

  describe('Complex Game Scenarios', () => {
    it('should handle a complete player interaction scenario', () => {
      // Scenario: Player presses space to jump, which starts a timer for landing
      const jumpTrigger: Trigger = {
        event: 'on.key',
        actions: [
          {
            type: 'if',
            params: {
              condition: { type: 'equals', variable: 'isGrounded', value: true },
              then: [
                { type: 'setVar', params: { variable: 'isGrounded', value: false } },
                { type: 'setVar', params: { variable: 'isJumping', value: true } },
                {
                  type: 'tween',
                  params: {
                    property: 'transform.position.y',
                    to: -50,
                    duration: 500,
                    easing: 'easeOut'
                  }
                },
                {
                  type: 'startTimer',
                  params: {
                    id: 'jump-timer',
                    duration: 1000,
                    actions: [
                      { type: 'setVar', params: { variable: 'isGrounded', value: true } },
                      { type: 'setVar', params: { variable: 'isJumping', value: false } },
                      {
                        type: 'tween',
                        params: {
                          property: 'transform.position.y',
                          to: 0,
                          duration: 500,
                          easing: 'easeIn'
                        }
                      }
                    ]
                  }
                }
              ]
            }
          }
        ]
      };

      const player = createMockNode('player', [jumpTrigger]);
      player.transform.position = { x: 0, y: 0 };
      triggerSystem.registerNode(player, mockContext);

      // Initialize player state
      variables.set('isGrounded', true);
      variables.set('isJumping', false);

      // Player presses space to jump
      const jumpEvent: InputEvent = {
        type: 'key',
        key: 'space',
        pressed: true
      };

      triggerSystem.handleInput(jumpEvent, mockContext);

      // Check immediate state changes
      expect(variables.get('isGrounded')).toBe(false);
      expect(variables.get('isJumping')).toBe(true);

      // Simulate jump tween
      actionSystem.update(500);
      expect(player.transform.position.y).toBeCloseTo(-50, 1);

      // Simulate timer completion and landing
      actionSystem.update(500); // Complete jump timer
      expect(variables.get('isGrounded')).toBe(true);
      expect(variables.get('isJumping')).toBe(false);

      // Simulate landing tween
      actionSystem.update(500);
      expect(player.transform.position.y).toBeCloseTo(0, 1);
    });

    it('should handle multiple nodes with different trigger types', () => {
      // Create a score display that updates on tick
      const scoreDisplay = createMockNode('score-display', [
        {
          event: 'on.tick',
          actions: [
            {
              type: 'if',
              params: {
                condition: { type: 'greater', variable: 'score', value: 0 },
                then: [
                  { type: 'setVar', params: { variable: 'displayScore', value: true } }
                ]
              }
            }
          ]
        }
      ]);

      // Create a player that can score points
      const player = createMockNode('player', [
        {
          event: 'on.key',
          actions: [
            { type: 'incVar', params: { variable: 'score', amount: 10 } }
          ]
        }
      ]);

      triggerSystem.registerNode(scoreDisplay, mockContext);
      triggerSystem.registerNode(player, mockContext);

      variables.set('score', 0);

      // Initially no score display
      triggerSystem.processTick(mockContext);
      expect(variables.get('displayScore')).toBeUndefined();

      // Player scores
      const keyEvent: InputEvent = {
        type: 'key',
        key: 'space',
        pressed: true
      };
      triggerSystem.handleInput(keyEvent, mockContext);

      expect(variables.get('score')).toBe(10);

      // Now score display should activate
      triggerSystem.processTick(mockContext);
      expect(variables.get('displayScore')).toBe(true);
    });
  });
});