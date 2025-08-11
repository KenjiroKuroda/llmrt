/**
 * Tests for InputIntegration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InputIntegration } from './input-integration.js';
import { InputManager } from '../types/core.js';
import { TriggerSystem } from './trigger-system.js';
import { ActionSystem } from './action-system.js';

// Mock InputManager
class MockInputManager implements InputManager {
  private actionStates = new Map<string, boolean>();
  private justPressedStates = new Map<string, boolean>();
  private justReleasedStates = new Map<string, boolean>();
  private pointerPosition = { x: 0, y: 0 };

  mapKey(key: string, action: string): void {
    // Mock implementation
  }

  mapPointer(button: number, action: string): void {
    // Mock implementation
  }

  isActionPressed(action: string): boolean {
    return this.actionStates.get(action) || false;
  }

  isActionJustPressed(action: string): boolean {
    return this.justPressedStates.get(action) || false;
  }

  isActionJustReleased(action: string): boolean {
    return this.justReleasedStates.get(action) || false;
  }

  getPointerPosition() {
    return { ...this.pointerPosition };
  }

  getPointerWorldPosition() {
    return { ...this.pointerPosition };
  }

  initialize(): void {
    // Mock implementation
  }

  cleanup(): void {
    // Mock implementation
  }

  update(): void {
    // Mock implementation
  }

  // Test helper methods
  setActionState(action: string, pressed: boolean): void {
    this.actionStates.set(action, pressed);
  }

  setJustPressed(action: string, justPressed: boolean): void {
    this.justPressedStates.set(action, justPressed);
  }

  setJustReleased(action: string, justReleased: boolean): void {
    this.justReleasedStates.set(action, justReleased);
  }

  setPointerPosition(x: number, y: number): void {
    this.pointerPosition = { x, y };
  }
}

describe('InputIntegration', () => {
  let inputManager: MockInputManager;
  let actionSystem: ActionSystem;
  let triggerSystem: TriggerSystem;
  let inputIntegration: InputIntegration;

  beforeEach(() => {
    inputManager = new MockInputManager();
    actionSystem = new ActionSystem();
    triggerSystem = new TriggerSystem(actionSystem);
    inputIntegration = new InputIntegration(inputManager, triggerSystem);
  });

  describe('initialization', () => {
    it('should create input integration', () => {
      expect(inputIntegration).toBeDefined();
    });

    it('should setup default mappings', () => {
      const mapKeySpy = vi.spyOn(inputManager, 'mapKey');
      const mapPointerSpy = vi.spyOn(inputManager, 'mapPointer');

      inputIntegration.setupDefaultMappings();

      // Verify navigation keys were mapped
      expect(mapKeySpy).toHaveBeenCalledWith('up', 'nav-up');
      expect(mapKeySpy).toHaveBeenCalledWith('down', 'nav-down');
      expect(mapKeySpy).toHaveBeenCalledWith('left', 'nav-left');
      expect(mapKeySpy).toHaveBeenCalledWith('right', 'nav-right');

      // Verify action keys were mapped
      expect(mapKeySpy).toHaveBeenCalledWith('space', 'primary-action');
      expect(mapKeySpy).toHaveBeenCalledWith('enter', 'confirm');
      expect(mapKeySpy).toHaveBeenCalledWith('escape', 'cancel');

      // Verify WASD keys were mapped
      expect(mapKeySpy).toHaveBeenCalledWith('w', 'move-up');
      expect(mapKeySpy).toHaveBeenCalledWith('a', 'move-left');
      expect(mapKeySpy).toHaveBeenCalledWith('s', 'move-down');
      expect(mapKeySpy).toHaveBeenCalledWith('d', 'move-right');

      // Verify pointer mappings
      expect(mapPointerSpy).toHaveBeenCalledWith(0, 'primary-click');
      expect(mapPointerSpy).toHaveBeenCalledWith(2, 'secondary-click');
    });
  });

  describe('input state forwarding', () => {
    it('should forward key state changes to trigger system', () => {
      const handleInputSpy = vi.spyOn(triggerSystem, 'handleInput');
      const mockContext = {
        engine: {} as any,
        gameLoop: {} as any,
        sceneTree: {} as any,
        renderer: {} as any,
        variables: new Map(),
        node: {} as any
      };

      // Simulate key press
      inputManager.setActionState('primary-action', true);
      inputIntegration.update(mockContext);

      expect(handleInputSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'key',
          key: 'space',
          pressed: true
        }),
        mockContext
      );
    });

    it('should forward pointer state changes to trigger system', () => {
      const handleInputSpy = vi.spyOn(triggerSystem, 'handleInput');
      const mockContext = {
        engine: {} as any,
        gameLoop: {} as any,
        sceneTree: {} as any,
        renderer: {} as any,
        variables: new Map(),
        node: {} as any
      };

      // Set pointer position
      inputManager.setPointerPosition(100, 200);
      
      // Simulate pointer press
      inputManager.setActionState('primary-click', true);
      inputIntegration.update(mockContext);

      expect(handleInputSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'pointer',
          button: 0,
          position: { x: 100, y: 200 },
          pressed: true
        }),
        mockContext
      );
    });

    it('should only forward state changes, not continuous states', () => {
      const handleInputSpy = vi.spyOn(triggerSystem, 'handleInput');
      const mockContext = {
        engine: {} as any,
        gameLoop: {} as any,
        sceneTree: {} as any,
        renderer: {} as any,
        variables: new Map(),
        node: {} as any
      };

      // First update with key pressed
      inputManager.setActionState('primary-action', true);
      inputIntegration.update(mockContext);

      expect(handleInputSpy).toHaveBeenCalledTimes(1);

      // Second update with same state - should not trigger again
      inputIntegration.update(mockContext);

      expect(handleInputSpy).toHaveBeenCalledTimes(1);

      // Third update with key released - should trigger again
      inputManager.setActionState('primary-action', false);
      inputIntegration.update(mockContext);

      expect(handleInputSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('action state queries', () => {
    it('should forward action pressed queries to input manager', () => {
      inputManager.setActionState('test-action', true);
      
      expect(inputIntegration.isActionPressed('test-action')).toBe(true);
      expect(inputIntegration.isActionPressed('other-action')).toBe(false);
    });

    it('should forward just pressed queries to input manager', () => {
      inputManager.setJustPressed('test-action', true);
      
      expect(inputIntegration.isActionJustPressed('test-action')).toBe(true);
      expect(inputIntegration.isActionJustPressed('other-action')).toBe(false);
    });

    it('should forward just released queries to input manager', () => {
      inputManager.setJustReleased('test-action', true);
      
      expect(inputIntegration.isActionJustReleased('test-action')).toBe(true);
      expect(inputIntegration.isActionJustReleased('other-action')).toBe(false);
    });

    it('should forward pointer position queries to input manager', () => {
      inputManager.setPointerPosition(150, 250);
      
      const position = inputIntegration.getPointerPosition();
      expect(position.x).toBe(150);
      expect(position.y).toBe(250);
    });
  });

  describe('key mapping', () => {
    it('should map navigation keys correctly', () => {
      const mockContext = {
        engine: {} as any,
        gameLoop: {} as any,
        sceneTree: {} as any,
        renderer: {} as any,
        variables: new Map(),
        node: {} as any
      };

      const handleInputSpy = vi.spyOn(triggerSystem, 'handleInput');

      // Test arrow keys
      inputManager.setActionState('nav-up', true);
      inputIntegration.update(mockContext);

      expect(handleInputSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'key',
          key: 'up',
          pressed: true
        }),
        mockContext
      );
    });

    it('should map WASD keys correctly', () => {
      const mockContext = {
        engine: {} as any,
        gameLoop: {} as any,
        sceneTree: {} as any,
        renderer: {} as any,
        variables: new Map(),
        node: {} as any
      };

      const handleInputSpy = vi.spyOn(triggerSystem, 'handleInput');

      // Test WASD keys
      inputManager.setActionState('move-up', true);
      inputIntegration.update(mockContext);

      expect(handleInputSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'key',
          key: 'w',
          pressed: true
        }),
        mockContext
      );
    });
  });

  describe('pointer mapping', () => {
    it('should map pointer buttons correctly', () => {
      const mockContext = {
        engine: {} as any,
        gameLoop: {} as any,
        sceneTree: {} as any,
        renderer: {} as any,
        variables: new Map(),
        node: {} as any
      };

      const handleInputSpy = vi.spyOn(triggerSystem, 'handleInput');

      // Test right click
      inputManager.setActionState('secondary-click', true);
      inputIntegration.update(mockContext);

      expect(handleInputSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'pointer',
          button: 2,
          pressed: true
        }),
        mockContext
      );
    });
  });
});