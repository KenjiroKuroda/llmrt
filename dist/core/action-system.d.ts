/**
 * Action and Trigger execution system
 */
import { Action } from '../types/actions.js';
import { Node, LGFCartridge, AudioManager } from '../types/core.js';
import { GameLoop } from './game-loop.js';
export interface ActionContext {
    node: Node;
    cartridge: LGFCartridge;
    gameLoop: GameLoop;
    audioManager: AudioManager;
    variables: Map<string, any>;
    currentScene: string;
    sceneNodes: Map<string, Node>;
}
export interface TweenTarget {
    object: any;
    property: string;
    startValue: number;
    endValue: number;
    duration: number;
    elapsed: number;
    easing: EasingFunction;
}
export type EasingFunction = (t: number) => number;
export declare class ActionSystem {
    private tweens;
    private timers;
    private nextTweenId;
    private nextTimerId;
    constructor();
    /**
     * Execute an action with the given context
     */
    executeAction(action: Action, context: ActionContext): Promise<void>;
    /**
     * Update all active tweens and timers
     */
    update(deltaTime: number): void;
    /**
     * Evaluate conditions for an action
     */
    private evaluateConditions;
    /**
     * Evaluate a single condition
     */
    private evaluateCondition;
    private executeGotoScene;
    private executeSpawn;
    private executeDespawn;
    private executeSetVar;
    private executeIncVar;
    private executeRandomInt;
    private executeIf;
    private executeTween;
    private executeStartTimer;
    private executeStopTimer;
    private executePlaySfx;
    private executePlayMusic;
    private executeStopMusic;
    private createNodeFromData;
    private getPropertyValue;
    private setPropertyValue;
    private getEasingFunction;
    private updateTweens;
    private updateTimers;
}
//# sourceMappingURL=action-system.d.ts.map