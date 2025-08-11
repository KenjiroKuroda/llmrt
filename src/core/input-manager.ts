/**
 * Input management system for the LLM Canvas Engine
 * Handles keyboard and pointer input with action mapping and state tracking
 */

import { Vector2 } from '../types/core.js';

export interface InputManager {
  mapKey(key: string, action: string): void;
  mapPointer(button: number, action: string): void;
  isActionPressed(action: string): boolean;
  isActionJustPressed(action: string): boolean;
  isActionJustReleased(action: string): boolean;
  getPointerPosition(): Vector2;
  getPointerWorldPosition(camera?: any): Vector2;
  initialize(canvas: HTMLCanvasElement): void;
  cleanup(): void;
  update(): void;
}

interface InputState {
  pressed: boolean;
  justPressed: boolean;
  justReleased: boolean;
  framePressed: number;
  frameReleased: number;
}

interface PointerState {
  position: Vector2;
  worldPosition: Vector2;
  buttons: Map<number, InputState>;
}

export class InputManagerImpl implements InputManager {
  private keyMappings = new Map<string, string>();
  private pointerMappings = new Map<number, string>();
  private actionStates = new Map<string, InputState>();
  private keyStates = new Map<string, InputState>();
  private pointerState: PointerState;
  private canvas: HTMLCanvasElement | null = null;
  private frameCount = 0;
  private isInitialized = false;

  // Event listeners for cleanup
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundPointerDown: (e: PointerEvent) => void;
  private boundPointerUp: (e: PointerEvent) => void;
  private boundPointerMove: (e: PointerEvent) => void;
  private boundContextMenu: (e: Event) => void;

  constructor() {
    this.pointerState = {
      position: { x: 0, y: 0 },
      worldPosition: { x: 0, y: 0 },
      buttons: new Map()
    };

    // Bind event handlers for cleanup
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.boundPointerDown = this.handlePointerDown.bind(this);
    this.boundPointerUp = this.handlePointerUp.bind(this);
    this.boundPointerMove = this.handlePointerMove.bind(this);
    this.boundContextMenu = this.handleContextMenu.bind(this);
  }

  initialize(canvas: HTMLCanvasElement): void {
    if (this.isInitialized) {
      this.cleanup();
    }

    this.canvas = canvas;
    this.isInitialized = true;

    // Add keyboard event listeners to document
    document.addEventListener('keydown', this.boundKeyDown);
    document.addEventListener('keyup', this.boundKeyUp);

    // Add pointer event listeners to canvas
    canvas.addEventListener('pointerdown', this.boundPointerDown);
    canvas.addEventListener('pointerup', this.boundPointerUp);
    canvas.addEventListener('pointermove', this.boundPointerMove);
    canvas.addEventListener('contextmenu', this.boundContextMenu);

    // Make canvas focusable for keyboard events
    canvas.tabIndex = 0;
    canvas.style.outline = 'none';
  }

  cleanup(): void {
    if (!this.isInitialized) return;

    // Remove event listeners
    document.removeEventListener('keydown', this.boundKeyDown);
    document.removeEventListener('keyup', this.boundKeyUp);

    if (this.canvas) {
      this.canvas.removeEventListener('pointerdown', this.boundPointerDown);
      this.canvas.removeEventListener('pointerup', this.boundPointerUp);
      this.canvas.removeEventListener('pointermove', this.boundPointerMove);
      this.canvas.removeEventListener('contextmenu', this.boundContextMenu);
    }

    this.canvas = null;
    this.isInitialized = false;
  }

  mapKey(key: string, action: string): void {
    // Sanitize key input
    const sanitizedKey = this.sanitizeKey(key);
    const sanitizedAction = this.sanitizeAction(action);
    
    if (sanitizedKey && sanitizedAction) {
      this.keyMappings.set(sanitizedKey, sanitizedAction);
    }
  }

  mapPointer(button: number, action: string): void {
    // Sanitize inputs
    if (button < 0 || button > 4) return; // Only support standard mouse buttons
    const sanitizedAction = this.sanitizeAction(action);
    
    if (sanitizedAction) {
      this.pointerMappings.set(button, sanitizedAction);
    }
  }

  isActionPressed(action: string): boolean {
    const state = this.actionStates.get(action);
    return state ? state.pressed : false;
  }

  isActionJustPressed(action: string): boolean {
    const state = this.actionStates.get(action);
    return state ? state.justPressed : false;
  }

  isActionJustReleased(action: string): boolean {
    const state = this.actionStates.get(action);
    return state ? state.justReleased : false;
  }

  getPointerPosition(): Vector2 {
    return { ...this.pointerState.position };
  }

  getPointerWorldPosition(camera?: any): Vector2 {
    // For now, return screen position. Camera transformation would be added later
    return { ...this.pointerState.position };
  }

  update(): void {
    this.frameCount++;

    // Update action states based on key and pointer states
    this.updateActionStates();

    // Clear just-pressed and just-released flags after one frame
    this.clearFrameFlags();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const key = this.normalizeKey(event.code);
    if (!key) return;

    // Prevent default for mapped keys to avoid browser shortcuts
    const action = this.keyMappings.get(key);
    if (action) {
      event.preventDefault();
    }

    this.updateKeyState(key, true);
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const key = this.normalizeKey(event.code);
    if (!key) return;

    this.updateKeyState(key, false);
  }

  private handlePointerDown(event: PointerEvent): void {
    if (!this.canvas) return;

    event.preventDefault();
    this.canvas.focus(); // Ensure canvas has focus for keyboard events

    this.updatePointerPosition(event);
    this.updatePointerButtonState(event.button, true);
  }

  private handlePointerUp(event: PointerEvent): void {
    event.preventDefault();
    this.updatePointerPosition(event);
    this.updatePointerButtonState(event.button, false);
  }

  private handlePointerMove(event: PointerEvent): void {
    this.updatePointerPosition(event);
  }

  private handleContextMenu(event: Event): void {
    // Prevent context menu to avoid interfering with right-click actions
    event.preventDefault();
  }

  private updatePointerPosition(event: PointerEvent): void {
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    this.pointerState.position = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  private updateKeyState(key: string, pressed: boolean): void {
    let state = this.keyStates.get(key);
    if (!state) {
      state = {
        pressed: false,
        justPressed: false,
        justReleased: false,
        framePressed: -1,
        frameReleased: -1
      };
      this.keyStates.set(key, state);
    }

    if (pressed && !state.pressed) {
      state.pressed = true;
      state.justPressed = true;
      state.framePressed = this.frameCount;
    } else if (!pressed && state.pressed) {
      state.pressed = false;
      state.justReleased = true;
      state.frameReleased = this.frameCount;
    }
  }

  private updatePointerButtonState(button: number, pressed: boolean): void {
    let state = this.pointerState.buttons.get(button);
    if (!state) {
      state = {
        pressed: false,
        justPressed: false,
        justReleased: false,
        framePressed: -1,
        frameReleased: -1
      };
      this.pointerState.buttons.set(button, state);
    }

    if (pressed && !state.pressed) {
      state.pressed = true;
      state.justPressed = true;
      state.framePressed = this.frameCount;
    } else if (!pressed && state.pressed) {
      state.pressed = false;
      state.justReleased = true;
      state.frameReleased = this.frameCount;
    }
  }

  private updateActionStates(): void {
    // Update action states based on key mappings
    for (const [key, action] of this.keyMappings) {
      const keyState = this.keyStates.get(key);
      if (keyState) {
        this.updateActionState(action, keyState);
      }
    }

    // Update action states based on pointer mappings
    for (const [button, action] of this.pointerMappings) {
      const buttonState = this.pointerState.buttons.get(button);
      if (buttonState) {
        this.updateActionState(action, buttonState);
      }
    }
  }

  private updateActionState(action: string, inputState: InputState): void {
    let actionState = this.actionStates.get(action);
    if (!actionState) {
      actionState = {
        pressed: false,
        justPressed: false,
        justReleased: false,
        framePressed: -1,
        frameReleased: -1
      };
      this.actionStates.set(action, actionState);
    }

    // Action is pressed if any mapped input is pressed
    if (inputState.pressed) {
      if (!actionState.pressed) {
        actionState.pressed = true;
        actionState.justPressed = true;
        actionState.framePressed = this.frameCount;
      }
    }

    // Action is released when all mapped inputs are released
    if (!inputState.pressed && actionState.pressed) {
      // Check if any other inputs for this action are still pressed
      let anyPressed = false;
      
      for (const [key, mappedAction] of this.keyMappings) {
        if (mappedAction === action) {
          const keyState = this.keyStates.get(key);
          if (keyState && keyState.pressed) {
            anyPressed = true;
            break;
          }
        }
      }

      if (!anyPressed) {
        for (const [button, mappedAction] of this.pointerMappings) {
          if (mappedAction === action) {
            const buttonState = this.pointerState.buttons.get(button);
            if (buttonState && buttonState.pressed) {
              anyPressed = true;
              break;
            }
          }
        }
      }

      if (!anyPressed) {
        actionState.pressed = false;
        actionState.justReleased = true;
        actionState.frameReleased = this.frameCount;
      }
    }
  }

  private clearFrameFlags(): void {
    // Clear just-pressed and just-released flags for keys
    for (const state of this.keyStates.values()) {
      if (state.justPressed && state.framePressed < this.frameCount) {
        state.justPressed = false;
      }
      if (state.justReleased && state.frameReleased < this.frameCount) {
        state.justReleased = false;
      }
    }

    // Clear just-pressed and just-released flags for pointer buttons
    for (const state of this.pointerState.buttons.values()) {
      if (state.justPressed && state.framePressed < this.frameCount) {
        state.justPressed = false;
      }
      if (state.justReleased && state.frameReleased < this.frameCount) {
        state.justReleased = false;
      }
    }

    // Clear just-pressed and just-released flags for actions
    for (const state of this.actionStates.values()) {
      if (state.justPressed && state.framePressed < this.frameCount) {
        state.justPressed = false;
      }
      if (state.justReleased && state.frameReleased < this.frameCount) {
        state.justReleased = false;
      }
    }
  }

  private normalizeKey(code: string): string | null {
    // Normalize key codes to consistent format
    // Remove common prefixes and convert to lowercase
    const normalized = code
      .replace(/^(Key|Digit|Numpad|Arrow)/, '')
      .toLowerCase();

    // Map some special cases for accessibility
    const keyMap: Record<string, string> = {
      'space': 'space',
      'enter': 'enter',
      'escape': 'escape',
      'tab': 'tab',
      'backspace': 'backspace',
      'delete': 'delete',
      'home': 'home',
      'end': 'end',
      'pageup': 'pageup',
      'pagedown': 'pagedown',
      'up': 'up',
      'down': 'down',
      'left': 'left',
      'right': 'right'
    };

    return keyMap[normalized] || normalized;
  }

  private sanitizeKey(key: string): string | null {
    // Only allow alphanumeric keys and common special keys
    const allowedPattern = /^[a-z0-9]$|^(space|enter|escape|tab|backspace|delete|home|end|pageup|pagedown|up|down|left|right|shift|ctrl|alt|meta)$/i;
    
    const normalized = key.toLowerCase().trim();
    return allowedPattern.test(normalized) ? normalized : null;
  }

  private sanitizeAction(action: string): string | null {
    // Only allow alphanumeric characters, underscores, and hyphens
    const allowedPattern = /^[a-zA-Z0-9_-]+$/;
    
    const trimmed = action.trim();
    return allowedPattern.test(trimmed) && trimmed.length <= 50 ? trimmed : null;
  }
}