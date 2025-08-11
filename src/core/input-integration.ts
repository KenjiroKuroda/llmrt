/**
 * Integration layer between InputManager and TriggerSystem
 * This bridges the new InputManager with the existing trigger system
 */

import { InputManager } from '../types/core.js';
import { TriggerSystem, InputEvent } from './trigger-system.js';
import { ActionContext } from './action-system.js';

export class InputIntegration {
  private inputManager: InputManager;
  private triggerSystem: TriggerSystem;
  private previousKeyStates = new Map<string, boolean>();
  private previousPointerStates = new Map<number, boolean>();

  constructor(inputManager: InputManager, triggerSystem: TriggerSystem) {
    this.inputManager = inputManager;
    this.triggerSystem = triggerSystem;
  }

  /**
   * Update input integration - should be called each frame
   * This checks for input state changes and forwards them to the trigger system
   */
  update(context: ActionContext): void {
    this.checkKeyStateChanges(context);
    this.checkPointerStateChanges(context);
  }

  /**
   * Set up common input mappings for accessibility and navigation
   */
  setupDefaultMappings(): void {
    // Navigation keys
    this.inputManager.mapKey('up', 'nav-up');
    this.inputManager.mapKey('down', 'nav-down');
    this.inputManager.mapKey('left', 'nav-left');
    this.inputManager.mapKey('right', 'nav-right');
    
    // Action keys
    this.inputManager.mapKey('space', 'primary-action');
    this.inputManager.mapKey('enter', 'confirm');
    this.inputManager.mapKey('escape', 'cancel');
    this.inputManager.mapKey('tab', 'next');
    
    // WASD movement
    this.inputManager.mapKey('w', 'move-up');
    this.inputManager.mapKey('a', 'move-left');
    this.inputManager.mapKey('s', 'move-down');
    this.inputManager.mapKey('d', 'move-right');
    
    // Pointer mappings
    this.inputManager.mapPointer(0, 'primary-click'); // Left click
    this.inputManager.mapPointer(2, 'secondary-click'); // Right click
  }

  /**
   * Check for key state changes and forward to trigger system
   */
  private checkKeyStateChanges(context: ActionContext): void {
    // List of keys to monitor (could be expanded or made configurable)
    const keysToMonitor = [
      'space', 'enter', 'escape', 'tab',
      'up', 'down', 'left', 'right',
      'w', 'a', 's', 'd',
      'shift', 'ctrl', 'alt'
    ];

    for (const key of keysToMonitor) {
      const wasPressed = this.previousKeyStates.get(key) || false;
      const isPressed = this.inputManager.isActionPressed(this.getActionForKey(key));
      
      if (isPressed !== wasPressed) {
        const inputEvent: InputEvent = {
          type: 'key',
          key: key,
          pressed: isPressed
        };
        
        this.triggerSystem.handleInput(inputEvent, context);
        this.previousKeyStates.set(key, isPressed);
      }
    }
  }

  /**
   * Check for pointer state changes and forward to trigger system
   */
  private checkPointerStateChanges(context: ActionContext): void {
    const buttonsToMonitor = [0, 1, 2]; // Left, middle, right

    for (const button of buttonsToMonitor) {
      const wasPressed = this.previousPointerStates.get(button) || false;
      const isPressed = this.inputManager.isActionPressed(this.getActionForPointer(button));
      
      if (isPressed !== wasPressed) {
        const inputEvent: InputEvent = {
          type: 'pointer',
          button: button,
          position: this.inputManager.getPointerPosition(),
          pressed: isPressed
        };
        
        this.triggerSystem.handleInput(inputEvent, context);
        this.previousPointerStates.set(button, isPressed);
      }
    }
  }

  /**
   * Get the action name for a key (based on default mappings)
   */
  private getActionForKey(key: string): string {
    const keyActionMap: Record<string, string> = {
      'up': 'nav-up',
      'down': 'nav-down',
      'left': 'nav-left',
      'right': 'nav-right',
      'space': 'primary-action',
      'enter': 'confirm',
      'escape': 'cancel',
      'tab': 'next',
      'w': 'move-up',
      'a': 'move-left',
      's': 'move-down',
      'd': 'move-right'
    };
    
    return keyActionMap[key] || key;
  }

  /**
   * Get the action name for a pointer button
   */
  private getActionForPointer(button: number): string {
    const buttonActionMap: Record<number, string> = {
      0: 'primary-click',
      1: 'middle-click',
      2: 'secondary-click'
    };
    
    return buttonActionMap[button] || `button-${button}`;
  }

  /**
   * Check if a specific action is currently pressed
   */
  isActionPressed(action: string): boolean {
    return this.inputManager.isActionPressed(action);
  }

  /**
   * Check if a specific action was just pressed this frame
   */
  isActionJustPressed(action: string): boolean {
    return this.inputManager.isActionJustPressed(action);
  }

  /**
   * Check if a specific action was just released this frame
   */
  isActionJustReleased(action: string): boolean {
    return this.inputManager.isActionJustReleased(action);
  }

  /**
   * Get current pointer position
   */
  getPointerPosition() {
    return this.inputManager.getPointerPosition();
  }
}