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
    size: number;
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
    theme: any;
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
    rate: number;
    lifetime: number;
    lifetimeVariance: number;
    velocity: Vector2;
    velocityVariance: Vector2;
    acceleration: Vector2;
    scale: number;
    scaleVariance: number;
    rotation: number;
    rotationSpeed: number;
    color: string;
    colorEnd?: string;
    alpha: number;
    alphaEnd?: number;
    enabled: boolean;
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
//# sourceMappingURL=modules.d.ts.map