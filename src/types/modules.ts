/**
 * Module system type definitions
 */

import { Node, Vector2 } from './core.js';

export interface ModuleDefinition {
  name: string;
  nodeTypes: string[];
  actions: string[];
  triggers: string[];
  dependencies: string[];
  size: number; // Estimated KB contribution
}

export interface RenderModule {
  name: string;
  nodeTypes: string[];
  render(node: Node, context: RenderContext): void;
}

export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  camera: Camera2D;
  theme: any; // ThemeTokens
  interpolation: number;
  viewport: Viewport;
}

export interface Camera2D {
  position: Vector2;
  zoom: number;
  rotation: number;
  target: Vector2;
}

export interface Viewport {
  width: number;
  height: number;
  scale: number;
  offset: Vector2;
}

// Module-specific node types
export interface Mode7PlaneNode extends Node {
  type: 'Mode7Plane';
  texture: string;
  horizon: number;
  scale: number;
  offset: Vector2;
}

export interface RaycastMapNode extends Node {
  type: 'RaycastMap';
  map: number[][];
  textures: string[];
  billboards: Billboard[];
  fov: number;
  renderDistance: number;
}

export interface Billboard {
  position: Vector2;
  texture: string;
  scale: number;
}

export interface TilemapIsoNode extends Node {
  type: 'TilemapIso';
  tileset: string;
  map: number[][];
  tileSize: Vector2;
  elevation: number[][];
  tilesetColumns?: number;
  tilesetRows?: number;
}

export interface PostChainNode extends Node {
  type: 'PostChain';
  effects: PostEffect[];
  renderTarget?: string;
}

export interface PostEffect {
  type: 'vignette' | 'bloom-lite' | 'color-grading';
  enabled: boolean;
  intensity: number;
}

export interface Particles2DNode extends Node {
  type: 'Particles2D';
  emitter: ParticleEmitter;
  maxParticles: number;
  texture?: string;
  blendMode?: 'normal' | 'additive' | 'multiply';
}

export interface ParticleEmitter {
  position: Vector2;
  rate: number;           // Particles per second
  lifetime: number;       // Particle lifetime in seconds
  lifetimeVariance: number; // Variance in lifetime
  velocity: Vector2;      // Initial velocity
  velocityVariance: Vector2; // Variance in velocity
  acceleration: Vector2;  // Acceleration applied to particles
  scale: number;          // Initial scale
  scaleVariance: number;  // Variance in scale
  rotation: number;       // Initial rotation
  rotationSpeed: number;  // Rotation speed
  color: string;          // Initial color
  colorEnd?: string;      // End color (for color interpolation)
  alpha: number;          // Initial alpha
  alphaEnd?: number;      // End alpha
  enabled: boolean;       // Whether emitter is active
}

export interface Particle {
  id: number;
  position: Vector2;
  velocity: Vector2;
  acceleration: Vector2;
  scale: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  colorEnd?: string;
  alpha: number;
  alphaEnd?: number;
  lifetime: number;
  maxLifetime: number;
  age: number;
}