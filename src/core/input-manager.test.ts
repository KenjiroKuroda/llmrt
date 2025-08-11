/**
 * Tests for InputManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InputManagerImpl } from './input-manager.js';

// Mock PointerEvent for Node.js environment
class MockPointerEvent extends Event {
  button: number;
  clientX: number;
  clientY: number;

  constructor(type: string, options: { button?: number; clientX?: number; clientY?: number } = {}) {
    super(type);
    this.button = options.button || 0;
    this.clientX = options.clientX || 0;
    this.clientY = options.clientY || 0;
  }

  preventDefault() {
    // Mock preventDefault
  }
}

// Make PointerEvent available globally for tests
(global as any).PointerEvent = MockPointerEvent;

// Mock HTMLCanvasElement
class MockCanvas {
  private eventListeners = new Map<string, EventListener[]>();
  
  tabIndex = 0;
  style = { outline: 'none' };

  addEventListener(type: string, listener: EventListener): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  getBoundingClientRect() {
    return {
      left: 0,
      top: 0,
      width: 800,
      height: 600
    };
  }

  focus() {
    // Mock focus method
  }

  dispatchEvent(event: Event): boolean {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
    return true;
  }
}

// Mock document event handling
const documentEventListeners = new Map<string, EventListener[]>();
const originalAddEventListener = document.addEventListener;
const originalRemoveEventListener = document.removeEventListener;

function mockDocumentEvents() {
  document.addEventListener = vi.fn((type: string, listener: EventListener) => {
    if (!documentEventListeners.has(type)) {
      documentEventListeners.set(type, []);
    }
    documentEventListeners.get(type)!.push(listener);
  });

  document.removeEventListener = vi.fn((type: string, listener: EventListener) => {
    const listeners = documentEventListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  });
}

function restoreDocumentEvents() {
  document.addEventListener = originalAddEventListener;
  document.removeEventListener = originalRemoveEventListener;
  documentEventListeners.clear();
}

function dispatchDocumentEvent(event: Event): void {
  const listeners = documentEventListeners.get(event.type);
  if (listeners) {
    listeners.forEach(listener => listener(event));
  }
}

describe('InputManager', () => {
  let inputManager: InputManagerImpl;
  let canvas: MockCanvas;

  beforeEach(() => {
    inputManager = new InputManagerImpl();
    canvas = new MockCanvas();
    mockDocumentEvents();
  });

  afterEach(() => {
    inputManager.cleanup();
    restoreDocumentEvents();
  });

  describe('initialization', () => {
    it('should initialize with canvas', () => {
      expect(() => inputManager.initialize(canvas as any)).not.toThrow();
    });

    it('should cleanup properly', () => {
      inputManager.initialize(canvas as any);
      expect(() => inputManager.cleanup()).not.toThrow();
    });

    it('should handle multiple initializations', () => {
      inputManager.initialize(canvas as any);
      expect(() => inputManager.initialize(canvas as any)).not.toThrow();
    });
  });

  describe('key mapping', () => {
    beforeEach(() => {
      inputManager.initialize(canvas as any);
    });

    it('should map keys to actions', () => {
      inputManager.mapKey('space', 'jump');
      inputManager.mapKey('a', 'move-left');
      inputManager.mapKey('d', 'move-right');

      // Simulate key press
      const keyEvent = new KeyboardEvent('keydown', { code: 'Space' });
      dispatchDocumentEvent(keyEvent);
      inputManager.update();

      expect(inputManager.isActionPressed('jump')).toBe(true);
      expect(inputManager.isActionJustPressed('jump')).toBe(true);
    });

    it('should sanitize key inputs', () => {
      // Valid keys should work
      inputManager.mapKey('a', 'valid-action');
      inputManager.mapKey('space', 'jump');
      inputManager.mapKey('enter', 'confirm');

      // Invalid keys should be ignored
      inputManager.mapKey('<script>', 'malicious');
      inputManager.mapKey('', 'empty');
      inputManager.mapKey('very-long-key-name-that-exceeds-limits', 'long');

      const keyEvent = new KeyboardEvent('keydown', { code: 'KeyA' });
      dispatchDocumentEvent(keyEvent);
      inputManager.update();

      expect(inputManager.isActionPressed('valid-action')).toBe(true);
      expect(inputManager.isActionPressed('malicious')).toBe(false);
    });

    it('should sanitize action names', () => {
      // Valid actions should work
      inputManager.mapKey('a', 'move-left');
      inputManager.mapKey('b', 'action_2');
      inputManager.mapKey('c', 'jump123');

      // Invalid actions should be ignored
      inputManager.mapKey('d', '<script>alert("xss")</script>');
      inputManager.mapKey('e', '');
      inputManager.mapKey('f', 'a'.repeat(100)); // Too long

      const keyEvent = new KeyboardEvent('keydown', { code: 'KeyA' });
      dispatchDocumentEvent(keyEvent);
      inputManager.update();

      expect(inputManager.isActionPressed('move-left')).toBe(true);
    });
  });

  describe('pointer mapping', () => {
    beforeEach(() => {
      inputManager.initialize(canvas as any);
    });

    it('should map pointer buttons to actions', () => {
      inputManager.mapPointer(0, 'primary-action'); // Left click
      inputManager.mapPointer(2, 'secondary-action'); // Right click

      // Simulate pointer press
      const pointerEvent = new PointerEvent('pointerdown', { 
        button: 0,
        clientX: 100,
        clientY: 200
      });
      canvas.dispatchEvent(pointerEvent);
      inputManager.update();

      expect(inputManager.isActionPressed('primary-action')).toBe(true);
      expect(inputManager.isActionJustPressed('primary-action')).toBe(true);
    });

    it('should track pointer position', () => {
      const pointerEvent = new PointerEvent('pointermove', {
        clientX: 150,
        clientY: 250
      });
      canvas.dispatchEvent(pointerEvent);

      const position = inputManager.getPointerPosition();
      expect(position.x).toBe(150);
      expect(position.y).toBe(250);
    });

    it('should sanitize pointer button inputs', () => {
      // Valid buttons (0-4)
      inputManager.mapPointer(0, 'left-click');
      inputManager.mapPointer(1, 'middle-click');
      inputManager.mapPointer(2, 'right-click');

      // Invalid buttons should be ignored
      inputManager.mapPointer(-1, 'invalid');
      inputManager.mapPointer(10, 'invalid');

      const pointerEvent = new PointerEvent('pointerdown', { button: 0 });
      canvas.dispatchEvent(pointerEvent);
      inputManager.update();

      expect(inputManager.isActionPressed('left-click')).toBe(true);
      expect(inputManager.isActionPressed('invalid')).toBe(false);
    });
  });

  describe('input state tracking', () => {
    beforeEach(() => {
      inputManager.initialize(canvas as any);
      inputManager.mapKey('space', 'jump');
    });

    it('should track pressed state', () => {
      const keyDownEvent = new KeyboardEvent('keydown', { code: 'Space' });
      dispatchDocumentEvent(keyDownEvent);
      inputManager.update();

      expect(inputManager.isActionPressed('jump')).toBe(true);
      expect(inputManager.isActionJustPressed('jump')).toBe(true);
      expect(inputManager.isActionJustReleased('jump')).toBe(false);
    });

    it('should track released state', () => {
      // Press key
      const keyDownEvent = new KeyboardEvent('keydown', { code: 'Space' });
      dispatchDocumentEvent(keyDownEvent);
      inputManager.update();

      // Release key
      const keyUpEvent = new KeyboardEvent('keyup', { code: 'Space' });
      dispatchDocumentEvent(keyUpEvent);
      inputManager.update();

      expect(inputManager.isActionPressed('jump')).toBe(false);
      expect(inputManager.isActionJustPressed('jump')).toBe(false);
      expect(inputManager.isActionJustReleased('jump')).toBe(true);
    });

    it('should clear just-pressed flags after one frame', () => {
      const keyDownEvent = new KeyboardEvent('keydown', { code: 'Space' });
      dispatchDocumentEvent(keyDownEvent);
      inputManager.update();

      expect(inputManager.isActionJustPressed('jump')).toBe(true);

      // Next frame
      inputManager.update();
      expect(inputManager.isActionJustPressed('jump')).toBe(false);
      expect(inputManager.isActionPressed('jump')).toBe(true); // Still pressed
    });

    it('should clear just-released flags after one frame', () => {
      // Press and release key
      const keyDownEvent = new KeyboardEvent('keydown', { code: 'Space' });
      dispatchDocumentEvent(keyDownEvent);
      inputManager.update();

      const keyUpEvent = new KeyboardEvent('keyup', { code: 'Space' });
      dispatchDocumentEvent(keyUpEvent);
      inputManager.update();

      expect(inputManager.isActionJustReleased('jump')).toBe(true);

      // Next frame
      inputManager.update();
      expect(inputManager.isActionJustReleased('jump')).toBe(false);
    });
  });

  describe('multiple input mapping', () => {
    beforeEach(() => {
      inputManager.initialize(canvas as any);
      inputManager.mapKey('space', 'jump');
      inputManager.mapKey('w', 'jump');
      inputManager.mapPointer(0, 'jump');
    });

    it('should handle multiple inputs for same action', () => {
      // Press space
      const spaceEvent = new KeyboardEvent('keydown', { code: 'Space' });
      dispatchDocumentEvent(spaceEvent);
      inputManager.update();

      expect(inputManager.isActionPressed('jump')).toBe(true);

      // Release space but press W
      const spaceUpEvent = new KeyboardEvent('keyup', { code: 'Space' });
      dispatchDocumentEvent(spaceUpEvent);
      
      const wEvent = new KeyboardEvent('keydown', { code: 'KeyW' });
      dispatchDocumentEvent(wEvent);
      inputManager.update();

      // Action should still be pressed
      expect(inputManager.isActionPressed('jump')).toBe(true);
      expect(inputManager.isActionJustReleased('jump')).toBe(false);
    });

    it('should release action only when all inputs are released', () => {
      // Press both space and W
      const spaceEvent = new KeyboardEvent('keydown', { code: 'Space' });
      const wEvent = new KeyboardEvent('keydown', { code: 'KeyW' });
      dispatchDocumentEvent(spaceEvent);
      dispatchDocumentEvent(wEvent);
      inputManager.update();

      expect(inputManager.isActionPressed('jump')).toBe(true);

      // Release space
      const spaceUpEvent = new KeyboardEvent('keyup', { code: 'Space' });
      dispatchDocumentEvent(spaceUpEvent);
      inputManager.update();

      // Action should still be pressed (W is still down)
      expect(inputManager.isActionPressed('jump')).toBe(true);
      expect(inputManager.isActionJustReleased('jump')).toBe(false);

      // Release W
      const wUpEvent = new KeyboardEvent('keyup', { code: 'KeyW' });
      dispatchDocumentEvent(wUpEvent);
      inputManager.update();

      // Now action should be released
      expect(inputManager.isActionPressed('jump')).toBe(false);
      expect(inputManager.isActionJustReleased('jump')).toBe(true);
    });
  });

  describe('keyboard navigation support', () => {
    beforeEach(() => {
      inputManager.initialize(canvas as any);
    });

    it('should support arrow keys for navigation', () => {
      inputManager.mapKey('up', 'nav-up');
      inputManager.mapKey('down', 'nav-down');
      inputManager.mapKey('left', 'nav-left');
      inputManager.mapKey('right', 'nav-right');

      const upEvent = new KeyboardEvent('keydown', { code: 'ArrowUp' });
      dispatchDocumentEvent(upEvent);
      inputManager.update();

      expect(inputManager.isActionPressed('nav-up')).toBe(true);
    });

    it('should support tab and enter for accessibility', () => {
      inputManager.mapKey('tab', 'nav-next');
      inputManager.mapKey('enter', 'activate');
      inputManager.mapKey('escape', 'cancel');

      const tabEvent = new KeyboardEvent('keydown', { code: 'Tab' });
      dispatchDocumentEvent(tabEvent);
      inputManager.update();

      expect(inputManager.isActionPressed('nav-next')).toBe(true);
    });

    it('should prevent default for mapped keys', () => {
      inputManager.mapKey('space', 'jump');

      const spaceEvent = new KeyboardEvent('keydown', { code: 'Space' });
      const preventDefaultSpy = vi.spyOn(spaceEvent, 'preventDefault');
      
      dispatchDocumentEvent(spaceEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('security and sanitization', () => {
    beforeEach(() => {
      inputManager.initialize(canvas as any);
    });

    it('should reject malicious key names', () => {
      const maliciousKeys = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        'eval(malicious)',
        '../../etc/passwd',
        'null',
        'undefined'
      ];

      maliciousKeys.forEach(key => {
        inputManager.mapKey(key, 'test-action');
      });

      // None of these should create valid mappings
      const testEvent = new KeyboardEvent('keydown', { code: 'KeyA' });
      dispatchDocumentEvent(testEvent);
      inputManager.update();

      expect(inputManager.isActionPressed('test-action')).toBe(false);
    });

    it('should reject malicious action names', () => {
      const maliciousActions = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        'eval(malicious)',
        '../../etc/passwd',
        'a'.repeat(100), // Too long
        ''
      ];

      maliciousActions.forEach(action => {
        inputManager.mapKey('a', action);
      });

      const testEvent = new KeyboardEvent('keydown', { code: 'KeyA' });
      dispatchDocumentEvent(testEvent);
      inputManager.update();

      // None of the malicious actions should be active
      maliciousActions.forEach(action => {
        expect(inputManager.isActionPressed(action)).toBe(false);
      });
    });

    it('should handle context menu prevention', () => {
      const contextMenuEvent = new Event('contextmenu');
      const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');
      
      canvas.dispatchEvent(contextMenuEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      inputManager.initialize(canvas as any);
    });

    it('should handle unknown actions gracefully', () => {
      expect(inputManager.isActionPressed('unknown-action')).toBe(false);
      expect(inputManager.isActionJustPressed('unknown-action')).toBe(false);
      expect(inputManager.isActionJustReleased('unknown-action')).toBe(false);
    });

    it('should handle rapid key presses', () => {
      inputManager.mapKey('space', 'jump');

      // Rapid press/release
      for (let i = 0; i < 10; i++) {
        const keyDownEvent = new KeyboardEvent('keydown', { code: 'Space' });
        const keyUpEvent = new KeyboardEvent('keyup', { code: 'Space' });
        
        dispatchDocumentEvent(keyDownEvent);
        inputManager.update();
        
        dispatchDocumentEvent(keyUpEvent);
        inputManager.update();
      }

      // Should end in released state
      expect(inputManager.isActionPressed('jump')).toBe(false);
    });

    it('should handle canvas focus', () => {
      const focusSpy = vi.spyOn(canvas, 'focus');
      
      const pointerEvent = new PointerEvent('pointerdown', { button: 0 });
      canvas.dispatchEvent(pointerEvent);

      expect(focusSpy).toHaveBeenCalled();
    });
  });
});