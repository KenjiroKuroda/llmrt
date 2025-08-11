/**
 * Raycast rendering module for fake-3D wall and billboard effects
 * Implements raycasting algorithm for retro-style FPS games
 */
import { Node, Vector2 } from '../types/core.js';
import { RenderModule, RenderContext, ModuleDefinition, Billboard } from '../types/modules.js';
/**
 * Raycast specific node data
 */
export interface RaycastMapData {
    map: number[][];
    textures: string[];
    billboards: Billboard[];
    fov: number;
    renderDistance: number;
    mapWidth: number;
    mapHeight: number;
    tileSize: number;
}
/**
 * Raycast camera parameters
 */
export interface RaycastCamera {
    position: Vector2;
    rotation: number;
    height: number;
    pitch: number;
}
/**
 * Ray intersection result
 */
export interface RayHit {
    distance: number;
    wallType: number;
    hitPoint: Vector2;
    textureX: number;
    side: 'north' | 'south' | 'east' | 'west';
}
/**
 * Billboard rendering data
 */
export interface BillboardRenderData {
    billboard: Billboard;
    distance: number;
    screenX: number;
    screenSize: number;
    visible: boolean;
}
/**
 * Raycasting math utilities
 */
export declare class RaycastMath {
    /**
     * Cast a ray and find the first wall intersection
     */
    static castRay(origin: Vector2, angle: number, map: number[][], mapWidth: number, mapHeight: number, tileSize: number, maxDistance: number): RayHit;
    /**
     * Calculate billboard screen position and size
     */
    static calculateBillboard(billboard: Billboard, camera: RaycastCamera, viewport: {
        width: number;
        height: number;
    }, fov: number): BillboardRenderData;
    /**
     * Create a default raycast camera
     */
    static createDefaultCamera(): RaycastCamera;
}
/**
 * Raycast render module implementation
 */
export declare class RaycastRenderModule implements RenderModule {
    name: string;
    nodeTypes: string[];
    private textureCache;
    private defaultCamera;
    constructor();
    render(node: Node, context: RenderContext): void;
    private getRaycastData;
    private getRaycastCamera;
    private renderRaycastScene;
    private renderWallColumn;
    private renderTexturedWallColumn;
    private renderSolidWallColumn;
    private renderBillboards;
    private renderBillboard;
    private getTexture;
}
/**
 * Raycast module definition for registration
 */
export declare const RaycastModuleDefinition: ModuleDefinition;
/**
 * Register the raycast module
 */
export declare function registerRaycastModule(): void;
//# sourceMappingURL=raycast.d.ts.map