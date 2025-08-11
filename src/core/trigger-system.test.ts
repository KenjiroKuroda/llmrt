/**
 * Tests for the Trigger System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TriggerSystem, InputEvent } from './trigger-system.js';
import { ActionSystem, ActionContext } from './action-system.js';
import { Node, Transform2D } from '../types/core.js';
import { Trigger } from '../types/actions.js';

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

const createMockActionContext = (): ActionContext => ({
  node: createMockNode('test'),
  cartridge: {} as any,
  gameLoop: {} as any,
  variables: new Map(),
  currentScene: 'test-scene',
  sceneNodes: new Map()
});

describe('TriggerSystem', () => {
  let triggerSystem: TriggerSystem;
  let mockActionSystem: ActionSystem;
  let mockContext: ActionContext;

  beforeEach(() => {
    mockActionSystem = {
      executeAction: vi.fn()
    } as any;
    
    triggerSystem = new TriggerSystem(mockActionSystem);
    mockContext = createMockActionContext();
  });

  describe('Node Registration', () => {
    it('should register node and process on.start triggers', () => {
      const startTrigger: Trigger = {
        event: 'on.start',
        actions: [{ type: 'setVar', params: { variable: 'started', value: true } }]
      };
      
      const node = createMockNode('test-node', [startTrigger]);
      
      triggerSystem.registerNode(node, mockContext);
      
      expect(mockActionSystem.executeAction).toHaveBeenCalledWith(
        startTrigger.actions[0],
        expect.any(Object)
      );
    });

    it('should unregister node', () => {
      const node = createMockNode('test-node');
      
      triggerSystem.registerNode(node);
      triggerSystem.unregisterNode(node);
      
      // Node should no longer receive tick events
      triggerSystem.processTick(mockContext);
      expect(mockActionSystem.executeAction).not.toHaveBeenCalled();
    });
  });

  describe('Tick Processing', () => {
    it('should process on.tick triggers for all registered nodes', () => {
      const tickTrigger: Trigger = {
        event: 'on.tick',
        actions: [{ type: 'incVar', params: { variable: 'tickCount' } }]
      };
      
      const node1 = createMockNode('node1', [tickTrigger]);
      const node2 = createMockNode('node2', [tickTrigger]);
      
      triggerSystem.registerNode(node1);
      triggerSystem.registerNode(node2);
      
      // Clear start trigger calls
      vi.clearAllMocks();
      
      triggerSystem.processTick(mockContext);
      
      expect(mockActionSystem.executeAction).toHaveBeenCalledTimes(2);
    });

    it('should not process tick triggers for unregistered nodes', () => {
      const tickTrigger: Trigger = {
        event: 'on.tick',
        actions: [{ type: 'incVar', params: { variable: 'tickCount' } }]
      };
      
      const node = createMockNode('test-node', [tickTrigger]);
      
      triggerSystem.registerNode(node);
      triggerSystem.unregisterNode(node);
      
      triggerSystem.processTick(mockContext);
      
      expect(mockActionSystem.executeAction).not.toHaveBeenCalled();
    });
  });

  describe('Key Input Handling', () => {
    it('should trigger on.key events for key press', () => {
      const keyTrigger: Trigger = {
        event: 'on.key',
        actions: [{ type: 'setVar', params: { variable: 'keyPressed', value: 'space' } }]
      };
      
      const node = createMockNode('test-node', [keyTrigger]);
      triggerSystem.registerNode(node);
      
      // Clear start trigger calls
      vi.clearAllMocks();
      
      const keyEvent: InputEvent = {
        type: 'key',
        key: 'space',
        pressed: true
      };
      
      triggerSystem.handleInput(keyEvent, mockContext);
      
      expect(mockActionSystem.executeAction).toHaveBeenCalledWith(
        keyTrigger.actions[0],
        expect.objectContaining({
          eventData: { key: 'space' }
        })
      );
    });

    it('should not trigger on key release', () => {
      const keyTrigger: Trigger = {
        event: 'on.key',
        actions: [{ type: 'setVar', params: { variable: 'keyPressed', value: 'space' } }]
      };
      
      const node = createMockNode('test-node', [keyTrigger]);
      triggerSystem.registerNode(node);
      
      // Clear start trigger calls
      vi.clearAllMocks();
      
      // First press
      triggerSystem.handleInput({
        type: 'key',
        key: 'space',
        pressed: true
      }, mockContext);
      
      // Then release
      triggerSystem.handleInput({
        type: 'key',
        key: 'space',
        pressed: false
      }, mockContext);
      
      // Should only be called once (for press, not release)
      expect(mockActionSystem.executeAction).toHaveBeenCalledTimes(1);
    });

    it('should not trigger on key hold', () => {
      const keyTrigger: Trigger = {
        event: 'on.key',
        actions: [{ type: 'setVar', params: { variable: 'keyPressed', value: 'space' } }]
      };
      
      const node = createMockNode('test-node', [keyTrigger]);
      triggerSystem.registerNode(node);
      
      // Clear start trigger calls
      vi.clearAllMocks();
      
      // Multiple presses of same key while held
      triggerSystem.handleInput({
        type: 'key',
        key: 'space',
        pressed: true
      }, mockContext);
      
      triggerSystem.handleInput({
        type: 'key',
        key: 'space',
        pressed: true
      }, mockContext);
      
      // Should only be called once (first press only)
      expect(mockActionSystem.executeAction).toHaveBeenCalledTimes(1);
    });

    it('should track key states correctly', () => {
      triggerSystem.handleInput({
        type: 'key',
        key: 'space',
        pressed: true
      }, mockContext);
      
      expect(triggerSystem.isKeyPressed('space')).toBe(true);
      
      triggerSystem.handleInput({
        type: 'key',
        key: 'space',
        pressed: false
      }, mockContext);
      
      expect(triggerSystem.isKeyPressed('space')).toBe(false);
    });
  });

  describe('Pointer Input Handling', () => {
    it('should trigger on.pointer events for pointer press', () => {
      const pointerTrigger: Trigger = {
        event: 'on.pointer',
        actions: [{ type: 'setVar', params: { variable: 'clicked', value: true } }]
      };
      
      const node = createMockNode('test-node', [pointerTrigger]);
      // Position node at origin for hit test
      node.transform.position = { x: 0, y: 0 };
      
      triggerSystem.registerNode(node);
      
      // Clear start trigger calls
      vi.clearAllMocks();
      
      const pointerEvent: InputEvent = {
        type: 'pointer',
        button: 0,
        position: { x: 10, y: 10 }, // Close to node position
        pressed: true
      };
      
      triggerSystem.handleInput(pointerEvent, mockContext);
      
      expect(mockActionSystem.executeAction).toHaveBeenCalledWith(
        pointerTrigger.actions[0],
        expect.objectContaining({
          eventData: { 
            button: 0,
            position: { x: 10, y: 10 }
          }
        })
      );
    });

    it('should not trigger pointer events when not over node', () => {
      const pointerTrigger: Trigger = {
        event: 'on.pointer',
        actions: [{ type: 'setVar', params: { variable: 'clicked', value: true } }]
      };
      
      const node = createMockNode('test-node', [pointerTrigger]);
      // Position node far from click
      node.transform.position = { x: 0, y: 0 };
      
      triggerSystem.registerNode(node);
      
      // Clear start trigger calls
      vi.clearAllMocks();
      
      const pointerEvent: InputEvent = {
        type: 'pointer',
        button: 0,
        position: { x: 1000, y: 1000 }, // Far from node
        pressed: true
      };
      
      triggerSystem.handleInput(pointerEvent, mockContext);
      
      expect(mockActionSystem.executeAction).not.toHaveBeenCalled();
    });

    it('should track pointer states correctly', () => {
      triggerSystem.handleInput({
        type: 'pointer',
        button: 0,
        pressed: true
      }, mockContext);
      
      expect(triggerSystem.isPointerPressed(0)).toBe(true);
      
      triggerSystem.handleInput({
        type: 'pointer',
        button: 0,
        pressed: false
      }, mockContext);
      
      expect(triggerSystem.isPointerPressed(0)).toBe(false);
    });
  });

  describe('Timer Processing', () => {
    it('should process timer triggers when timers expire', () => {
      const timerTrigger: Trigger = {
        event: 'on.timer',
        actions: [{ type: 'setVar', params: { variable: 'timerFired', value: true } }]
      };
      
      const node = createMockNode('test-node', [timerTrigger]);
      triggerSystem.registerNode(node);
      
      // Start a timer
      triggerSystem.startTimer('test-timer', 1000);
      
      // Clear start trigger calls
      vi.clearAllMocks();
      
      // Process time but not enough to expire
      triggerSystem.processTimers(mockContext, 500);
      expect(mockActionSystem.executeAction).not.toHaveBeenCalled();
      
      // Process enough time to expire timer
      triggerSystem.processTimers(mockContext, 500);
      expect(mockActionSystem.executeAction).toHaveBeenCalledWith(
        timerTrigger.actions[0],
        expect.objectContaining({
          eventData: { timerId: 'test-timer' }
        })
      );
    });

    it('should stop timers correctly', () => {
      const timerTrigger: Trigger = {
        event: 'on.timer',
        actions: [{ type: 'setVar', params: { variable: 'timerFired', value: true } }]
      };
      
      const node = createMockNode('test-node', [timerTrigger]);
      triggerSystem.registerNode(node);
      
      // Start and immediately stop timer
      triggerSystem.startTimer('test-timer', 1000);
      triggerSystem.stopTimer('test-timer');
      
      // Clear start trigger calls
      vi.clearAllMocks();
      
      // Process time - timer should not fire
      triggerSystem.processTimers(mockContext, 1000);
      expect(mockActionSystem.executeAction).not.toHaveBeenCalled();
    });
  });

  describe('Input State Management', () => {
    it('should clear all input states', () => {
      // Set some input states
      triggerSystem.handleInput({
        type: 'key',
        key: 'space',
        pressed: true
      }, mockContext);
      
      triggerSystem.handleInput({
        type: 'pointer',
        button: 0,
        pressed: true
      }, mockContext);
      
      expect(triggerSystem.isKeyPressed('space')).toBe(true);
      expect(triggerSystem.isPointerPressed(0)).toBe(true);
      
      // Clear states
      triggerSystem.clearInputStates();
      
      expect(triggerSystem.isKeyPressed('space')).toBe(false);
      expect(triggerSystem.isPointerPressed(0)).toBe(false);
    });
  });

  describe('Multiple Trigger Types', () => {
    it('should handle nodes with multiple trigger types', () => {
      const triggers: Trigger[] = [
        {
          event: 'on.start',
          actions: [{ type: 'setVar', params: { variable: 'started', value: true } }]
        },
        {
          event: 'on.tick',
          actions: [{ type: 'incVar', params: { variable: 'ticks' } }]
        },
        {
          event: 'on.key',
          actions: [{ type: 'setVar', params: { variable: 'keyPressed', value: true } }]
        }
      ];
      
      const node = createMockNode('test-node', triggers);
      triggerSystem.registerNode(node, mockContext);
      
      // Should have processed start trigger
      expect(mockActionSystem.executeAction).toHaveBeenCalledWith(
        triggers[0].actions[0],
        expect.any(Object)
      );
      
      vi.clearAllMocks();
      
      // Process tick
      triggerSystem.processTick(mockContext);
      expect(mockActionSystem.executeAction).toHaveBeenCalledWith(
        triggers[1].actions[0],
        expect.any(Object)
      );
      
      vi.clearAllMocks();
      
      // Process key input
      triggerSystem.handleInput({
        type: 'key',
        key: 'space',
        pressed: true
      }, mockContext);
      
      expect(mockActionSystem.executeAction).toHaveBeenCalledWith(
        triggers[2].actions[0],
        expect.any(Object)
      );
    });
  });
});