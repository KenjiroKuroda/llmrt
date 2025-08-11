/**
 * Core type definitions for the LLM Canvas Engine
 */
import { Action, Trigger } from './actions.js';
export interface Vector2 {
    x: number;
    y: number;
}
export interface Transform2D {
    position: Vector2;
    scale: Vector2;
    rotation: number;
    skew: Vector2;
    alpha: number;
}
export interface LLMRTEngine {
    loadCartridge(cartridge: LGFCartridge, options?: any): Promise<void>;
    loadCartridgeFromJSON(jsonString: string, options?: any): Promise<void>;
    loadCartridgeFromURL(url: string, options?: any): Promise<void>;
    loadCartridgeFromFile(file: File, options?: any): Promise<void>;
    start(): void;
    stop(): void;
    pause(): void;
    resume(): void;
    getState(): EngineState;
    getInputManager(): InputManager;
    getAudioManager(): AudioManager;
    getAssetManager(): any;
    getCartridgeLoader(): any;
}
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
export interface AudioManager {
    playSfx(id: string, volume?: number): void;
    playMusic(id: string, loop?: boolean, volume?: number): void;
    stopMusic(): void;
    setMasterVolume(volume: number): void;
    loadAssets(assets: AudioAsset[]): Promise<void>;
    cleanup(): void;
    isUnlocked(): boolean;
    unlock(): Promise<void>;
}
export interface EngineState {
    running: boolean;
    paused: boolean;
    currentScene: string | null;
    tickCount: number;
    frameRate: number;
}
export interface GameLoop {
    readonly tickRate: number;
    readonly tickInterval: number;
    readonly tickCount: number;
    readonly frameCount: number;
    readonly isRunning: boolean;
    readonly isPaused: boolean;
    start(): void;
    stop(): void;
    pause(): void;
    resume(): void;
    getMetrics(): PerformanceMetrics;
    getRNG(): SeededRNG;
    seedRNG(seed: number): void;
}
export interface PerformanceMetrics {
    fps: number;
    averageFrameTime: number;
    tickRate: number;
    droppedFrames: number;
    totalTicks: number;
    totalFrames: number;
}
export interface SeededRNG {
    seed(value: number): void;
    random(): number;
    randomInt(min: number, max: number): number;
    randomFloat(min: number, max: number): number;
}
export interface LGFCartridge {
    version: string;
    metadata: CartridgeMetadata;
    theme: ThemeTokens;
    scenes: Scene[];
    assets: AssetManifest;
    variables?: Record<string, number | string | boolean>;
}
export interface CartridgeMetadata {
    title: string;
    author: string;
    description: string;
}
export interface Scene {
    id: string;
    root: Node;
}
export interface Node {
    id: string;
    type: NodeType;
    transform: Transform2D;
    visible: boolean;
    children: Node[];
    actions: Action[];
    triggers: Trigger[];
    addChild(child: Node): void;
    removeChild(child: Node): boolean;
    removeFromParent(): boolean;
    getRoot(): Node;
    getDepth(): number;
    getWorldTransform(): Transform2D;
    isWorldVisible(): boolean;
}
export type NodeType = 'Group' | 'Sprite' | 'Text' | 'Button' | 'Camera2D' | 'Particles2D' | 'PostChain' | 'Mode7Plane' | 'RaycastMap' | 'TilemapIso';
export interface ThemeTokens {
    colors: {
        primary: string;
        secondary: string;
        background: string;
        text: string;
        accent: string;
    };
    font: {
        family: string;
        sizes: Record<string, number>;
    };
    spacing: Record<string, number>;
    radii: Record<string, number>;
}
export interface AssetManifest {
    sprites: SpriteAsset[];
    audio: AudioAsset[];
    fonts: FontAsset[];
}
export interface SpriteAsset {
    id: string;
    url: string;
    width: number;
    height: number;
    frames?: number;
}
export interface AudioAsset {
    id: string;
    url: string;
    type: 'sfx' | 'music';
}
export interface FontAsset {
    id: string;
    family: string;
    url: string;
}
//# sourceMappingURL=core.d.ts.map