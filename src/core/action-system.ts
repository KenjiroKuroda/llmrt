/**
 * Action and Trigger execution system
 */

import { Action, Condition } from '../types/actions.js';
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

export class ActionSystem {
  private tweens: Map<string, TweenTarget> = new Map();
  private timers: Map<string, Timer> = new Map();
  private nextTweenId = 0;
  private nextTimerId = 0;

  constructor() {}

  /**
   * Execute an action with the given context
   */
  async executeAction(action: Action, context: ActionContext): Promise<void> {
    // Check conditions first
    if (action.conditions && !this.evaluateConditions(action.conditions, context)) {
      return;
    }

    switch (action.type) {
      case 'gotoScene':
        this.executeGotoScene(action, context);
        break;
      case 'spawn':
        this.executeSpawn(action, context);
        break;
      case 'despawn':
        this.executeDespawn(action, context);
        break;
      case 'setVar':
        this.executeSetVar(action, context);
        break;
      case 'incVar':
        this.executeIncVar(action, context);
        break;
      case 'randomInt':
        this.executeRandomInt(action, context);
        break;
      case 'if':
        this.executeIf(action, context);
        break;
      case 'tween':
        this.executeTween(action, context);
        break;
      case 'startTimer':
        this.executeStartTimer(action, context);
        break;
      case 'stopTimer':
        this.executeStopTimer(action, context);
        break;
      case 'playSfx':
        this.executePlaySfx(action, context);
        break;
      case 'playMusic':
        this.executePlayMusic(action, context);
        break;
      case 'stopMusic':
        this.executeStopMusic(action, context);
        break;
      default:
        console.warn(`Unsupported action type: ${action.type}`);
    }
  }

  /**
   * Update all active tweens and timers
   */
  update(deltaTime: number): void {
    this.updateTweens(deltaTime);
    this.updateTimers(deltaTime);
  }

  /**
   * Evaluate conditions for an action
   */
  private evaluateConditions(conditions: Condition[], context: ActionContext): boolean {
    return conditions.every(condition => this.evaluateCondition(condition, context));
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: Condition, context: ActionContext): boolean {
    const variable = context.variables.get(condition.variable);
    
    switch (condition.type) {
      case 'equals':
        return variable === condition.value;
      case 'greater':
        return typeof variable === 'number' && variable > (condition.value || 0);
      case 'less':
        return typeof variable === 'number' && variable < (condition.value || 0);
      case 'exists':
        return variable !== undefined;
      default:
        return false;
    }
  }

  // Action implementations
  private executeGotoScene(action: Action, context: ActionContext): void {
    const sceneId = action.params.scene;
    if (typeof sceneId === 'string') {
      // This would trigger a scene change in the engine
      context.variables.set('__nextScene', sceneId);
    }
  }

  private executeSpawn(action: Action, context: ActionContext): void {
    const nodeData = action.params.node;
    const parentId = action.params.parent || context.node.id;
    
    if (nodeData && typeof nodeData === 'object') {
      // Create new node from data
      const newNode = this.createNodeFromData(nodeData);
      const parent = context.sceneNodes.get(parentId);
      
      if (parent && newNode) {
        parent.addChild(newNode);
        context.sceneNodes.set(newNode.id, newNode);
      }
    }
  }

  private executeDespawn(action: Action, context: ActionContext): void {
    const nodeId = action.params.node || context.node.id;
    const node = context.sceneNodes.get(nodeId);
    
    if (node) {
      node.removeFromParent();
      context.sceneNodes.delete(nodeId);
    }
  }

  private executeSetVar(action: Action, context: ActionContext): void {
    const variable = action.params.variable;
    const value = action.params.value;
    
    if (typeof variable === 'string') {
      context.variables.set(variable, value);
    }
  }

  private executeIncVar(action: Action, context: ActionContext): void {
    const variable = action.params.variable;
    const amount = action.params.amount || 1;
    
    if (typeof variable === 'string') {
      const current = context.variables.get(variable) || 0;
      if (typeof current === 'number') {
        context.variables.set(variable, current + amount);
      }
    }
  }

  private executeRandomInt(action: Action, context: ActionContext): void {
    const min = action.params.min || 0;
    const max = action.params.max || 100;
    const variable = action.params.variable;
    
    if (typeof variable === 'string') {
      const value = context.gameLoop.getRNG().randomInt(min, max);
      context.variables.set(variable, value);
    }
  }

  private executeIf(action: Action, context: ActionContext): void {
    const condition = action.params.condition;
    const thenActions = action.params.then || [];
    const elseActions = action.params.else || [];
    
    if (condition && this.evaluateCondition(condition, context)) {
      // Execute then actions
      for (const thenAction of thenActions) {
        this.executeAction(thenAction, context);
      }
    } else {
      // Execute else actions
      for (const elseAction of elseActions) {
        this.executeAction(elseAction, context);
      }
    }
  }

  private executeTween(action: Action, context: ActionContext): void {
    const target = action.params.target || context.node;
    const property = action.params.property;
    const to = action.params.to;
    const duration = action.params.duration || 1000; // ms
    const easing = this.getEasingFunction(action.params.easing || 'linear');
    
    if (!target || !property || to === undefined) {
      return;
    }

    const startValue = this.getPropertyValue(target, property);
    if (typeof startValue !== 'number' || typeof to !== 'number') {
      return;
    }

    const tweenId = `tween_${this.nextTweenId++}`;
    const tween: TweenTarget = {
      object: target,
      property,
      startValue,
      endValue: to,
      duration,
      elapsed: 0,
      easing
    };

    this.tweens.set(tweenId, tween);
  }

  private executeStartTimer(action: Action, context: ActionContext): void {
    const duration = action.params.duration || 1000; // ms
    const actions = action.params.actions || [];
    const timerId = action.params.id || `timer_${this.nextTimerId++}`;
    
    const timer: Timer = {
      id: timerId,
      duration,
      elapsed: 0,
      actions,
      context
    };
    
    this.timers.set(timerId, timer);
  }

  private executeStopTimer(action: Action, _context: ActionContext): void {
    const timerId = action.params.id;
    if (typeof timerId === 'string') {
      this.timers.delete(timerId);
    }
  }

  private executePlaySfx(action: Action, context: ActionContext): void {
    const id = action.params.id;
    const volume = action.params.volume;
    
    if (typeof id === 'string') {
      context.audioManager.playSfx(id, volume);
    }
  }

  private executePlayMusic(action: Action, context: ActionContext): void {
    const id = action.params.id;
    const loop = action.params.loop;
    const volume = action.params.volume;
    
    if (typeof id === 'string') {
      context.audioManager.playMusic(id, loop, volume);
    }
  }

  private executeStopMusic(_action: Action, context: ActionContext): void {
    context.audioManager.stopMusic();
  }

  // Helper methods
  private createNodeFromData(_nodeData: any): Node | null {
    // This would create a proper Node instance from JSON data
    // For now, return null as this requires the full Node implementation
    return null;
  }

  private getPropertyValue(object: any, property: string): any {
    const parts = property.split('.');
    let current = object;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  private setPropertyValue(object: any, property: string, value: any): void {
    const parts = property.split('.');
    let current = object;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return;
      }
    }
    
    const finalPart = parts[parts.length - 1];
    if (current && typeof current === 'object') {
      current[finalPart] = value;
    }
  }

  private getEasingFunction(easing: string): EasingFunction {
    switch (easing) {
      case 'linear':
        return (t: number) => t;
      case 'easeIn':
        return (t: number) => t * t;
      case 'easeOut':
        return (t: number) => 1 - (1 - t) * (1 - t);
      case 'easeInOut':
        return (t: number) => t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
      default:
        return (t: number) => t;
    }
  }

  private updateTweens(deltaTime: number): void {
    const completedTweens: string[] = [];

    for (const [id, tween] of this.tweens) {
      tween.elapsed += deltaTime;
      const progress = Math.min(tween.elapsed / tween.duration, 1);
      const easedProgress = tween.easing(progress);
      
      const currentValue = tween.startValue + (tween.endValue - tween.startValue) * easedProgress;
      this.setPropertyValue(tween.object, tween.property, currentValue);
      
      if (progress >= 1) {
        completedTweens.push(id);
      }
    }

    // Remove completed tweens
    for (const id of completedTweens) {
      this.tweens.delete(id);
    }
  }

  private updateTimers(deltaTime: number): void {
    const completedTimers: string[] = [];

    for (const [id, timer] of this.timers) {
      timer.elapsed += deltaTime;
      
      if (timer.elapsed >= timer.duration) {
        // Execute timer actions
        for (const action of timer.actions) {
          this.executeAction(action, timer.context);
        }
        completedTimers.push(id);
      }
    }

    // Remove completed timers
    for (const id of completedTimers) {
      this.timers.delete(id);
    }
  }
}

interface Timer {
  id: string;
  duration: number;
  elapsed: number;
  actions: Action[];
  context: ActionContext;
}