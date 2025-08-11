/**
 * Action and Trigger system type definitions
 */

export interface Action {
  type: ActionType;
  params: Record<string, any>;
  conditions?: Condition[];
}

export type ActionType = 
  | 'gotoScene' | 'spawn' | 'despawn' 
  | 'setVar' | 'incVar' | 'randomInt' 
  | 'if' | 'tween' | 'playSprite' 
  | 'setCamera' | 'shake' | 'playSfx' 
  | 'playMusic' | 'stopMusic' | 'startTimer' | 'stopTimer' 
  | 'emit' | 'stopEmit' | 'moveCamera'
  | 'setMode7Camera' | 'moveMode7Camera' // Mode-7 actions
  | 'setRaycastCamera' | 'moveRaycastCamera' // Raycast actions
  | 'setIsoCamera' | 'moveIsoCamera' | 'setTileElevation' // Iso actions
  | 'setPostFX' | 'tweenPostFX' | 'enablePostFX' | 'disablePostFX' // PostFX actions
  | 'startEmit' | 'stopEmit' | 'burstEmit'; // Particle actions

export interface Condition {
  type: 'equals' | 'greater' | 'less' | 'exists';
  variable: string;
  value?: any;
}

export interface Trigger {
  event: TriggerEvent;
  actions: Action[];
}

export type TriggerEvent = 
  | 'on.start' | 'on.tick' | 'on.key' 
  | 'on.pointer' | 'on.timer'
  | 'on.raycastHit'; // Module event