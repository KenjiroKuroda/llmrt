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
export declare class InputManagerImpl implements InputManager {
    private keyMappings;
    private pointerMappings;
    private actionStates;
    private keyStates;
    private pointerState;
    private canvas;
    private frameCount;
    private isInitialized;
    private boundKeyDown;
    private boundKeyUp;
    private boundPointerDown;
    private boundPointerUp;
    private boundPointerMove;
    private boundContextMenu;
    constructor();
    initialize(canvas: HTMLCanvasElement): void;
    cleanup(): void;
    mapKey(key: string, action: string): void;
    mapPointer(button: number, action: string): void;
    isActionPressed(action: string): boolean;
    isActionJustPressed(action: string): boolean;
    isActionJustReleased(action: string): boolean;
    getPointerPosition(): Vector2;
    getPointerWorldPosition(camera?: any): Vector2;
    update(): void;
    private handleKeyDown;
    private handleKeyUp;
    private handlePointerDown;
    private handlePointerUp;
    private handlePointerMove;
    private handleContextMenu;
    private updatePointerPosition;
    private updateKeyState;
    private updatePointerButtonState;
    private updateActionStates;
    private updateActionState;
    private clearFrameFlags;
    private normalizeKey;
    private sanitizeKey;
    private sanitizeAction;
}
//# sourceMappingURL=input-manager.d.ts.map