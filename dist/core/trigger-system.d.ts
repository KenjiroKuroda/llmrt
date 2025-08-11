/**
 * Trigger event system
 */
import { Node } from '../types/core.js';
import { ActionSystem, ActionContext } from './action-system.js';
export interface TriggerContext extends ActionContext {
    eventData?: any;
}
export interface InputEvent {
    type: 'key' | 'pointer';
    key?: string;
    button?: number;
    position?: {
        x: number;
        y: number;
    };
    pressed?: boolean;
}
export declare class TriggerSystem {
    private actionSystem;
    private activeNodes;
    private keyStates;
    private pointerStates;
    private timers;
    constructor(actionSystem: ActionSystem);
    /**
     * Register a node for trigger processing
     */
    registerNode(node: Node, context?: ActionContext): void;
    /**
     * Unregister a node from trigger processing
     */
    unregisterNode(node: Node): void;
    /**
     * Process tick triggers for all registered nodes
     */
    processTick(context: ActionContext): void;
    /**
     * Handle input events and trigger appropriate actions
     */
    handleInput(event: InputEvent, context: ActionContext): void;
    /**
     * Process timer triggers
     */
    processTimers(context: ActionContext, deltaTime: number): void;
    /**
     * Start a timer that will trigger on.timer events
     */
    startTimer(id: string, duration: number): void;
    /**
     * Stop a timer
     */
    stopTimer(id: string): void;
    /**
     * Process triggers of a specific event type for a node
     */
    private processTriggers;
    /**
     * Handle keyboard events
     */
    private handleKeyEvent;
    /**
     * Handle pointer/mouse events
     */
    private handlePointerEvent;
    /**
     * Extract the key from a key trigger (if specified)
     */
    private getTriggerKey;
    /**
     * Check if pointer position is over a node
     * This is a simplified implementation - real implementation would need
     * proper transform calculations and bounds checking
     */
    private isPointerOverNode;
    /**
     * Get current key state
     */
    isKeyPressed(key: string): boolean;
    /**
     * Get current pointer button state
     */
    isPointerPressed(button?: number): boolean;
    /**
     * Clear all input states (useful for scene transitions)
     */
    clearInputStates(): void;
}
//# sourceMappingURL=trigger-system.d.ts.map