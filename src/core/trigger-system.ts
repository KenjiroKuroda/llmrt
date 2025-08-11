/**
 * Trigger event system
 */

import { Trigger, TriggerEvent } from '../types/actions.js';
import { Node } from '../types/core.js';
import { ActionSystem, ActionContext } from './action-system.js';

export interface TriggerContext extends ActionContext {
  eventData?: any;
}

export interface InputEvent {
  type: 'key' | 'pointer';
  key?: string;
  button?: number;
  position?: { x: number; y: number };
  pressed?: boolean;
}

export class TriggerSystem {
  private actionSystem: ActionSystem;
  private activeNodes: Set<Node> = new Set();
  private keyStates: Map<string, boolean> = new Map();
  private pointerStates: Map<number, boolean> = new Map();
  private timers: Map<string, number> = new Map();

  constructor(actionSystem: ActionSystem) {
    this.actionSystem = actionSystem;
  }

  /**
   * Register a node for trigger processing
   */
  registerNode(node: Node, context?: ActionContext): void {
    this.activeNodes.add(node);
    
    // Process on.start triggers immediately if context is provided
    if (context) {
      const startContext: TriggerContext = { ...context, node };
      this.processTriggers(node, 'on.start', startContext);
    }
  }

  /**
   * Unregister a node from trigger processing
   */
  unregisterNode(node: Node): void {
    this.activeNodes.delete(node);
  }

  /**
   * Process tick triggers for all registered nodes
   */
  processTick(context: ActionContext): void {
    for (const node of this.activeNodes) {
      const tickContext: TriggerContext = { ...context, node };
      this.processTriggers(node, 'on.tick', tickContext);
    }
  }

  /**
   * Handle input events and trigger appropriate actions
   */
  handleInput(event: InputEvent, context: ActionContext): void {
    if (event.type === 'key') {
      this.handleKeyEvent(event, context);
    } else if (event.type === 'pointer') {
      this.handlePointerEvent(event, context);
    }
  }

  /**
   * Process timer triggers
   */
  processTimers(context: ActionContext, deltaTime: number): void {
    // Update timer states
    for (const [timerId, remaining] of this.timers) {
      const newRemaining = remaining - deltaTime;
      
      if (newRemaining <= 0) {
        // Timer expired, trigger timer events
        for (const node of this.activeNodes) {
          const timerContext: TriggerContext = { 
            ...context, 
            node,
            eventData: { timerId }
          };
          this.processTriggers(node, 'on.timer', timerContext);
        }
        this.timers.delete(timerId);
      } else {
        this.timers.set(timerId, newRemaining);
      }
    }
  }

  /**
   * Start a timer that will trigger on.timer events
   */
  startTimer(id: string, duration: number): void {
    this.timers.set(id, duration);
  }

  /**
   * Stop a timer
   */
  stopTimer(id: string): void {
    this.timers.delete(id);
  }

  /**
   * Process triggers of a specific event type for a node
   */
  private processTriggers(node: Node, eventType: TriggerEvent, context?: TriggerContext): void {
    if (!node.triggers || !context) return;

    for (const trigger of node.triggers) {
      if (trigger.event === eventType) {
        // Execute all actions for this trigger
        for (const action of trigger.actions) {
          this.actionSystem.executeAction(action, context);
        }
      }
    }
  }

  /**
   * Handle keyboard events
   */
  private handleKeyEvent(event: InputEvent, context: ActionContext): void {
    if (!event.key) return;

    const wasPressed = this.keyStates.get(event.key) || false;
    const isPressed = event.pressed || false;
    
    this.keyStates.set(event.key, isPressed);

    // Only trigger on key press (not release or hold)
    if (isPressed && !wasPressed) {
      for (const node of this.activeNodes) {
        const keyContext: TriggerContext = {
          ...context,
          node,
          eventData: { key: event.key }
        };
        
        // Check if this node has key triggers for this specific key
        if (node.triggers) {
          for (const trigger of node.triggers) {
            if (trigger.event === 'on.key') {
              // Check if trigger is for this specific key or any key
              const triggerKey = this.getTriggerKey(trigger);
              if (!triggerKey || triggerKey === event.key) {
                for (const action of trigger.actions) {
                  this.actionSystem.executeAction(action, keyContext);
                }
              }
            }
          }
        }
      }
    }
  }

  /**
   * Handle pointer/mouse events
   */
  private handlePointerEvent(event: InputEvent, context: ActionContext): void {
    const button = event.button || 0;
    const wasPressed = this.pointerStates.get(button) || false;
    const isPressed = event.pressed || false;
    
    this.pointerStates.set(button, isPressed);

    // Only trigger on pointer press (not release or hold)
    if (isPressed && !wasPressed) {
      for (const node of this.activeNodes) {
        // Check if pointer is over this node (simplified check)
        if (this.isPointerOverNode(node, event.position)) {
          const pointerContext: TriggerContext = {
            ...context,
            node,
            eventData: { 
              button,
              position: event.position
            }
          };
          
          this.processTriggers(node, 'on.pointer', pointerContext);
        }
      }
    }
  }

  /**
   * Extract the key from a key trigger (if specified)
   */
  private getTriggerKey(): string | null {
    // Look for key specification in trigger actions or params
    // This is a simplified implementation
    return null;
  }

  /**
   * Check if pointer position is over a node
   * This is a simplified implementation - real implementation would need
   * proper transform calculations and bounds checking
   */
  private isPointerOverNode(node: Node, position?: { x: number; y: number }): boolean {
    if (!position || !node.visible) return false;
    
    // Simplified bounds check - real implementation would calculate
    // world transform and proper bounds
    const nodePos = node.transform.position;
    const distance = Math.sqrt(
      Math.pow(position.x - nodePos.x, 2) + 
      Math.pow(position.y - nodePos.y, 2)
    );
    
    // Simple radius check - real implementation would use proper bounds
    return distance < 50;
  }

  /**
   * Get current key state
   */
  isKeyPressed(key: string): boolean {
    return this.keyStates.get(key) || false;
  }

  /**
   * Get current pointer button state
   */
  isPointerPressed(button: number = 0): boolean {
    return this.pointerStates.get(button) || false;
  }

  /**
   * Clear all input states (useful for scene transitions)
   */
  clearInputStates(): void {
    this.keyStates.clear();
    this.pointerStates.clear();
  }
}