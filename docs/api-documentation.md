---
sidebar_position: 2
---

# API Documentation

This document provides comprehensive TypeScript definitions and API reference for the LLM Canvas Engine (LLMRT).

## Core Engine API

### LLMRTEngine

The main engine class that orchestrates all game systems.

```typescript
class LLMRTEngine {
  constructor(canvas: HTMLCanvasElement, options?: EngineOptions)
  
  // Cartridge Management
  loadCartridge(cartridge: LGFCartridge): Promise<void>
  unloadCartridge(): void
  
  // Engine Control
  start(): void
  stop(): void
  pause(): void
  resume(): void
  
  // State Management
  getState(): EngineState
  setState(state: Partial<EngineState>): void
  
  // Variable System
  getVariable(name: string): any
  setVariable(name: string, value: any): void
  
  // Scene Management
  getCurrentScene(): Scene | null
  gotoScene(sceneId: string, transition?: TransitionType): void
  
  // Module System
  registerModule(module: RenderModule): void
  unregisterModule(moduleName: string): void
  
  // Event System
  on(event: EngineEvent, callback: EventCallback): void
  off(event: EngineEvent, callback: EventCallback): void
  emit(event: EngineEvent, data?: any): void
  
  // Debugging
  getPerformanceStats(): PerformanceStats
  enableDebugMode(enabled: boolean): void
}
```

### EngineOptions

Configuration options for the engine.

```typescript
interface EngineOptions {
  // Performance
  targetFPS?: number          // Default: 60
  maxDeltaTime?: number       // Default: 0.05 (50ms)
  
  // Rendering
  antialias?: boolean         // Default: true
  alpha?: boolean             // Default: false
  preserveDrawingBuffer?: boolean // Default: false
  
  // Audio
  audioContext?: AudioContext
  masterVolume?: number       // Default: 1.0
  
  // Input
  preventContextMenu?: boolean // Default: true
  captureKeyboard?: boolean   // Default: true
  
  // Accessibility
  accessibility?: AccessibilityOptions
  
  // Debug
  debug?: boolean             // Default: false
  showFPS?: boolean          // Default: false
  showStats?: boolean        // Default: false
}

interface AccessibilityOptions {
  highContrast?: boolean      // Default: false
  textScale?: number          // Default: 1.0
  reducedMotion?: boolean     // Default: false
  screenReader?: boolean      // Default: false
}
```

### EngineState

Current state of the engine.

```typescript
interface EngineState {
  readonly isRunning: boolean
  readonly isPaused: boolean
  readonly currentScene: string | null
  readonly frameCount: number
  readonly gameTime: number
  readonly deltaTime: number
  readonly fps: number
  readonly variables: Record<string, any>
}
```

## Cartridge Format (LGF)

### LGFCartridge

The complete cartridge format specification.

```typescript
interface LGFCartridge {
  version: "1.0"
  metadata: CartridgeMetadata
  theme: ThemeTokens
  scenes: Scene[]
  assets: AssetManifest
  variables?: Record<string, any>
  modules?: string[]
}

interface CartridgeMetadata {
  title: string
  author: string
  description: string
  version?: string
  tags?: string[]
  thumbnail?: string
  created?: string
  modified?: string
}
```

### Scene

Scene definition with root node hierarchy.

```typescript
interface Scene {
  id: string
  name?: string
  root: Node
  camera?: string        // Camera node ID
  background?: string    // Background color or asset
  music?: string         // Background music asset ID
}
```

### Node

Base node interface with all common properties.

```typescript
interface Node {
  id: string
  type: NodeType
  name?: string
  transform: Transform2D
  visible: boolean
  children: Node[]
  actions: Action[]
  triggers: Trigger[]
  
  // Node-specific properties
  [key: string]: any
}

type NodeType = 
  | 'Group' 
  | 'Sprite' 
  | 'Text' 
  | 'Button' 
  | 'Camera2D' 
  | 'Particles2D' 
  | 'PostChain'
  | 'Mode7Plane'    // Module
  | 'RaycastMap'    // Module
  | 'TilemapIso'    // Module

interface Transform2D {
  position: [number, number]
  scale: [number, number]
  rotation: number
  skew: [number, number]
  alpha: number
}
```

### Specific Node Types

#### SpriteNode

```typescript
interface SpriteNode extends Node {
  type: 'Sprite'
  sprite: string          // Asset ID
  frame?: number          // Animation frame
  flipX?: boolean         // Horizontal flip
  flipY?: boolean         // Vertical flip
  tint?: string           // Color tint
  blendMode?: BlendMode   // Blend mode
}

type BlendMode = 
  | 'normal' 
  | 'multiply' 
  | 'screen' 
  | 'overlay' 
  | 'darken' 
  | 'lighten'
```

#### TextNode

```typescript
interface TextNode extends Node {
  type: 'Text'
  text: string
  fontSize: string | number
  color: string
  align?: TextAlign
  baseline?: TextBaseline
  maxWidth?: number
  lineHeight?: number
  fontWeight?: FontWeight
  fontStyle?: FontStyle
}

type TextAlign = 'left' | 'center' | 'right'
type TextBaseline = 'top' | 'middle' | 'bottom'
type FontWeight = 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'
type FontStyle = 'normal' | 'italic' | 'oblique'
```

#### ButtonNode

```typescript
interface ButtonNode extends Node {
  type: 'Button'
  text?: string
  sprite?: string
  fontSize?: string | number
  color?: string
  hoverColor?: string
  pressedColor?: string
  disabledColor?: string
  padding?: [number, number]
  border?: BorderStyle
  disabled?: boolean
}

interface BorderStyle {
  width: number
  color: string
  radius?: number
}
```

#### Camera2DNode

```typescript
interface Camera2DNode extends Node {
  type: 'Camera2D'
  zoom: number
  bounds?: CameraBounds
  follow?: string         // Node ID to follow
  followSpeed?: number    // Follow interpolation speed
  shake?: ShakeEffect
  viewport?: Viewport
}

interface CameraBounds {
  left: number
  right: number
  top: number
  bottom: number
}

interface ShakeEffect {
  intensity: number
  duration: number
  frequency?: number
}

interface Viewport {
  x: number
  y: number
  width: number
  height: number
}
```

#### Particles2DNode

```typescript
interface Particles2DNode extends Node {
  type: 'Particles2D'
  maxParticles: number
  emissionRate: number
  lifetime: number
  sprite?: string
  startColor: string
  endColor?: string
  startSize: number
  endSize?: number
  velocity: VelocityRange
  acceleration?: [number, number]
  gravity?: [number, number]
  emitting: boolean
  burst?: BurstConfig
}

interface VelocityRange {
  min: [number, number]
  max: [number, number]
}

interface BurstConfig {
  count: number
  interval: number
  cycles?: number
}
```

## Action System

### Action

Base action interface and all action types.

```typescript
interface Action {
  type: ActionType
  conditions?: Condition[]
  [key: string]: any
}

type ActionType = 
  // Scene Management
  | 'gotoScene' | 'spawn' | 'despawn'
  // Variables
  | 'setVar' | 'incVar' | 'randomInt'
  // Control Flow
  | 'if' | 'wait' | 'repeat'
  // Animation
  | 'tween' | 'playSprite' | 'stopSprite'
  // Camera
  | 'setCamera' | 'moveCamera' | 'shake'
  // Audio
  | 'playSfx' | 'playMusic' | 'stopMusic'
  // Timers
  | 'startTimer' | 'stopTimer'
  // Particles
  | 'emit' | 'stopEmit'
  // Custom
  | string

interface Condition {
  variable: string
  operator: ComparisonOperator
  value: any
}

type ComparisonOperator = '==' | '!=' | '<' | '<=' | '>' | '>=' | '&&' | '||'
```

### Specific Actions

#### Scene Actions

```typescript
interface GotoSceneAction extends Action {
  type: 'gotoScene'
  scene: string
  transition?: TransitionType
  data?: Record<string, any>
}

interface SpawnAction extends Action {
  type: 'spawn'
  template: string | Node
  position?: [number, number]
  parent?: string
  id?: string
  data?: Record<string, any>
}

interface DespawnAction extends Action {
  type: 'despawn'
  target: string
  effect?: string
}

type TransitionType = 'none' | 'fade' | 'slide' | 'zoom' | 'custom'
```

#### Variable Actions

```typescript
interface SetVarAction extends Action {
  type: 'setVar'
  name: string
  value: any
}

interface IncVarAction extends Action {
  type: 'incVar'
  name: string
  value: number
}

interface RandomIntAction extends Action {
  type: 'randomInt'
  name: string
  min: number
  max: number
}
```

#### Animation Actions

```typescript
interface TweenAction extends Action {
  type: 'tween'
  target: string
  property: string
  to: any
  duration: number
  easing?: EasingFunction
  delay?: number
  onComplete?: Action[]
  onUpdate?: Action[]
}

type EasingFunction = 
  | 'linear' 
  | 'ease-in' | 'ease-out' | 'ease-in-out'
  | 'bounce-in' | 'bounce-out' | 'bounce-in-out'
  | 'elastic-in' | 'elastic-out' | 'elastic-in-out'
  | 'back-in' | 'back-out' | 'back-in-out'
```

## Trigger System

### Trigger

Base trigger interface and event types.

```typescript
interface Trigger {
  event: TriggerEvent
  actions: Action[]
  conditions?: Condition[]
  once?: boolean          // Fire only once
  enabled?: boolean       // Can be disabled
}

type TriggerEvent = 
  // Core Events
  | 'on.start' | 'on.tick' | 'on.destroy'
  // Input Events
  | 'on.key' | 'on.pointer' | 'on.gamepad'
  // Timer Events
  | 'on.timer' | 'on.interval'
  // Collision Events
  | 'on.collision' | 'on.trigger'
  // Animation Events
  | 'on.tweenComplete' | 'on.animationEnd'
  // Module Events
  | 'on.raycastHit' | 'on.mode7Collision'
  // Custom Events
  | string
```

### Specific Triggers

#### Input Triggers

```typescript
interface KeyTrigger extends Trigger {
  event: 'on.key'
  key: KeyCode
  state?: KeyState
  modifiers?: KeyModifier[]
}

interface PointerTrigger extends Trigger {
  event: 'on.pointer'
  button?: number
  state?: PointerState
  area?: 'node' | 'global'
}

type KeyCode = 
  | 'space' | 'enter' | 'escape' | 'tab' | 'shift' | 'ctrl' | 'alt'
  | 'up' | 'down' | 'left' | 'right'
  | 'w' | 'a' | 's' | 'd'
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | string

type KeyState = 'pressed' | 'released' | 'held'
type PointerState = 'pressed' | 'released' | 'moved' | 'enter' | 'leave'
type KeyModifier = 'shift' | 'ctrl' | 'alt' | 'meta'
```

#### Timer Triggers

```typescript
interface TimerTrigger extends Trigger {
  event: 'on.timer'
  delay: number
  repeat?: boolean
  name?: string
}

interface IntervalTrigger extends Trigger {
  event: 'on.interval'
  interval: number
  count?: number
  name?: string
}
```

## Asset System

### AssetManifest

Complete asset manifest specification.

```typescript
interface AssetManifest {
  sprites: SpriteAsset[]
  audio: AudioAsset[]
  fonts: FontAsset[]
  data?: DataAsset[]
}

interface SpriteAsset {
  id: string
  url: string
  width?: number
  height?: number
  frames?: number
  frameWidth?: number
  frameHeight?: number
  animations?: SpriteAnimation[]
}

interface SpriteAnimation {
  name: string
  frames: number[]
  duration: number
  loop?: boolean
}

interface AudioAsset {
  id: string
  url: string
  type?: 'sfx' | 'music'
  volume?: number
  loop?: boolean
  preload?: boolean
}

interface FontAsset {
  id: string
  family: string
  url?: string
  weight?: FontWeight
  style?: FontStyle
}

interface DataAsset {
  id: string
  url: string
  type: 'json' | 'text' | 'binary'
}
```

## Theme System

### ThemeTokens

Complete theme token specification.

```typescript
interface ThemeTokens {
  colors: ColorTokens
  font: FontTokens
  spacing: SpacingTokens
  radii: RadiusTokens
  shadows?: ShadowTokens
  transitions?: TransitionTokens
  breakpoints?: BreakpointTokens
}

interface ColorTokens {
  primary: string
  secondary: string
  background: string
  text: string
  accent: string
  [key: string]: string
}

interface FontTokens {
  family: string
  sizes: Record<string, number>
  weights?: Record<string, FontWeight>
  lineHeights?: Record<string, number>
}

interface SpacingTokens {
  [key: string]: number
}

interface RadiusTokens {
  [key: string]: number
}

interface ShadowTokens {
  [key: string]: string
}

interface TransitionTokens {
  [key: string]: string
}

interface BreakpointTokens {
  [key: string]: number
}
```

## Module System

### RenderModule

Interface for creating custom render modules.

```typescript
interface RenderModule {
  name: string
  version: string
  nodeTypes: string[]
  dependencies?: string[]
  
  // Lifecycle
  initialize?(engine: LLMRTEngine): void
  destroy?(): void
  
  // Rendering
  render(node: Node, context: RenderContext): void
  
  // Actions
  actions?: Record<string, ActionHandler>
  
  // Triggers
  triggers?: Record<string, TriggerHandler>
}

interface RenderContext {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  camera: Camera2DNode
  theme: ThemeTokens
  interpolation: number
  deltaTime: number
  gameTime: number
}

type ActionHandler = (action: Action, context: ActionContext) => void
type TriggerHandler = (trigger: Trigger, context: TriggerContext) => boolean

interface ActionContext {
  engine: LLMRTEngine
  node: Node
  scene: Scene
  variables: Record<string, any>
}

interface TriggerContext {
  engine: LLMRTEngine
  node: Node
  scene: Scene
  event: any
}
```

## Performance Monitoring

### PerformanceStats

Performance monitoring data structure.

```typescript
interface PerformanceStats {
  fps: number
  frameTime: number
  updateTime: number
  renderTime: number
  memoryUsage: MemoryUsage
  nodeCount: number
  activeParticles: number
  audioSources: number
  textureMemory: number
}

interface MemoryUsage {
  used: number
  total: number
  limit: number
}
```

## Error Handling

### Error Types

```typescript
class LLMRTError extends Error {
  constructor(message: string, code?: string, details?: any)
  
  readonly code: string
  readonly details: any
}

class ValidationError extends LLMRTError {
  constructor(message: string, path?: string, value?: any)
  
  readonly path: string
  readonly value: any
}

class AssetLoadError extends LLMRTError {
  constructor(message: string, assetId: string, url?: string)
  
  readonly assetId: string
  readonly url: string
}

class RenderError extends LLMRTError {
  constructor(message: string, nodeId?: string, nodeType?: string)
  
  readonly nodeId: string
  readonly nodeType: string
}
```

## Utility Types

### Common Utility Types

```typescript
type Vector2 = [number, number]
type Vector3 = [number, number, number]
type Vector4 = [number, number, number, number]

type Color = string  // Hex color or theme token
type Duration = number  // Seconds
type Percentage = number  // 0.0 to 1.0

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

type EventCallback<T = any> = (data: T) => void

type Disposable = {
  dispose(): void
}
```

## Usage Examples

### Basic Engine Setup

```typescript
import { LLMRTEngine, LGFCartridge } from 'llmrt'

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement
const engine = new LLMRTEngine(canvas, {
  targetFPS: 60,
  debug: true
})

const cartridge: LGFCartridge = {
  version: "1.0",
  metadata: {
    title: "My Game",
    author: "Developer",
    description: "A simple game"
  },
  // ... rest of cartridge
}

await engine.loadCartridge(cartridge)
engine.start()
```

### Custom Module

```typescript
import { RenderModule, Node, RenderContext } from 'llmrt'

class CustomModule implements RenderModule {
  name = 'custom'
  version = '1.0.0'
  nodeTypes = ['CustomNode']
  
  render(node: Node, context: RenderContext): void {
    // Custom rendering logic
    const { ctx, camera, theme } = context
    
    ctx.fillStyle = theme.colors.primary
    ctx.fillRect(node.transform.position[0], node.transform.position[1], 50, 50)
  }
  
  actions = {
    customAction: (action, context) => {
      // Custom action implementation
      console.log('Custom action executed:', action)
    }
  }
}

// Register the module
engine.registerModule(new CustomModule())
```

This API documentation provides complete TypeScript definitions for all LLMRT interfaces and classes. Use these types to build type-safe games and extensions for the engine.