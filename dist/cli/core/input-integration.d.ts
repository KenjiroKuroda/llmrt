/**
 * Integration layer between InputManager and TriggerSystem
 * This bridges the new InputManager with the existing trigger system
 */
import { InputManager } from '../types/core.js';
import { TriggerSystem } from './trigger-system.js';
import { ActionContext } from './action-system.js';
export declare class InputIntegration {
    private inputManager;
    private triggerSystem;
    private previousKeyStates;
    private previousPointerStates;
    constructor(inputManager: InputManager, triggerSystem: TriggerSystem);
    /**
     * Update input integration - should be called each frame
     * This checks for input state changes and forwards them to the trigger system
     */
    update(context: ActionContext): void;
    /**
     * Set up common input mappings for accessibility and navigation
     */
    setupDefaultMappings(): void;
    /**
     * Check for key state changes and forward to trigger system
     */
    private checkKeyStateChanges;
    /**
     * Check for pointer state changes and forward to trigger system
     */
    private checkPointerStateChanges;
    /**
     * Get the action name for a key (based on default mappings)
     */
    private getActionForKey;
    /**
     * Get the action name for a pointer button
     */
    private getActionForPointer;
    /**
     * Check if a specific action is currently pressed
     */
    isActionPressed(action: string): boolean;
    /**
     * Check if a specific action was just pressed this frame
     */
    isActionJustPressed(action: string): boolean;
    /**
     * Check if a specific action was just released this frame
     */
    isActionJustReleased(action: string): boolean;
    /**
     * Get current pointer position
     */
    getPointerPosition(): import("../types/core.js").Vector2;
}
//# sourceMappingURL=input-integration.d.ts.map