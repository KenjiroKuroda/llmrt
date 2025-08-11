/**
 * Mode-7 rendering module for fake-3D plane effects
 * Implements perspective transformation math for retro-style racing games
 */
import { Node, Vector2 } from '../types/core.js';
import { RenderModule, RenderContext, ModuleDefinition } from '../types/modules.js';
/**
 * Mode-7 specific node data
 */
export interface Mode7PlaneData {
    texture: string;
    horizon: number;
    scale: number;
    offset: Vector2;
    textureWidth: number;
    textureHeight: number;
}
/**
 * Mode-7 camera parameters
 */
export interface Mode7Camera {
    position: Vector2;
    rotation: number;
    height: number;
    pitch: number;
    fov: number;
}
/**
 * Mode-7 transformation math utilities
 */
export declare class Mode7Math {
    /**
     * Transform screen coordinates to world coordinates using Mode-7 perspective
     */
    static screenToWorld(screenX: number, screenY: number, camera: Mode7Camera, viewport: {
        width: number;
        height: number;
        horizon: number;
    }): Vector2;
    /**
     * Transform world coordinates to screen coordinates using Mode-7 perspective
     */
    static worldToScreen(worldX: number, worldY: number, camera: Mode7Camera, viewport: {
        width: number;
        height: number;
        horizon: number;
    }): Vector2;
    /**
     * Calculate texture coordinates for a world position
     */
    static getTextureCoordinates(worldPos: Vector2, textureSize: Vector2, scale: number, offset: Vector2): Vector2;
    /**
     * Create a default Mode-7 camera
     */
    static createDefaultCamera(): Mode7Camera;
}
/**
 * Mode-7 render module implementation
 */
export declare class Mode7RenderModule implements RenderModule {
    name: string;
    nodeTypes: string[];
    private textureCache;
    private defaultCamera;
    constructor();
    render(node: Node, context: RenderContext): void;
    private getMode7Data;
    private getMode7Camera;
    private getTexture;
    private renderPlaceholder;
    private renderMode7Plane;
    private renderScanline;
    private sampleTexture;
}
/**
 * Mode-7 module definition for registration
 */
export declare const Mode7ModuleDefinition: ModuleDefinition;
/**
 * Register the Mode-7 module
 */
export declare function registerMode7Module(): void;
//# sourceMappingURL=mode7.d.ts.map