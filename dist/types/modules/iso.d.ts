/**
 * Isometric tilemap rendering module for fake-3D tile-based games
 * Implements isometric projection math for retro-style strategy and RPG games
 */
import { Node, Vector2 } from '../types/core.js';
import { RenderModule, RenderContext, ModuleDefinition } from '../types/modules.js';
/**
 * Isometric tilemap specific node data
 */
export interface TilemapIsoData {
    tileset: string;
    map: number[][];
    tileSize: Vector2;
    elevation: number[][];
    mapWidth: number;
    mapHeight: number;
    tilesetColumns: number;
    tilesetRows: number;
}
/**
 * Isometric camera parameters
 */
export interface IsoCamera {
    position: Vector2;
    zoom: number;
    offset: Vector2;
}
/**
 * Tile collision data
 */
export interface TileCollision {
    tileX: number;
    tileY: number;
    tileIndex: number;
    elevation: number;
    worldPos: Vector2;
}
/**
 * Isometric math utilities
 */
export declare class IsoMath {
    /**
     * Convert world coordinates to isometric screen coordinates
     */
    static worldToIso(worldX: number, worldY: number, tileSize: Vector2): Vector2;
    /**
     * Convert isometric screen coordinates to world coordinates
     */
    static isoToWorld(isoX: number, isoY: number, tileSize: Vector2): Vector2;
    /**
     * Convert tile coordinates to isometric screen coordinates
     */
    static tileToIso(tileX: number, tileY: number, tileSize: Vector2, elevation?: number): Vector2;
    /**
     * Convert screen coordinates to tile coordinates
     */
    static screenToTile(screenX: number, screenY: number, camera: IsoCamera, tileSize: Vector2): Vector2;
    /**
     * Get tile bounds in screen coordinates
     */
    static getTileBounds(tileX: number, tileY: number, tileSize: Vector2, elevation?: number): {
        topLeft: Vector2;
        topRight: Vector2;
        bottomLeft: Vector2;
        bottomRight: Vector2;
    };
    /**
     * Check if a point is inside a tile diamond
     */
    static isPointInTile(pointX: number, pointY: number, tileX: number, tileY: number, tileSize: Vector2, elevation?: number): boolean;
    /**
     * Get tiles that should be rendered for the current viewport
     */
    static getVisibleTiles(camera: IsoCamera, viewport: {
        width: number;
        height: number;
    }, tileSize: Vector2, mapWidth: number, mapHeight: number): {
        startX: number;
        endX: number;
        startY: number;
        endY: number;
    };
    /**
     * Calculate render order for tiles (back to front)
     */
    static calculateRenderOrder(startX: number, endX: number, startY: number, endY: number): Array<{
        x: number;
        y: number;
    }>;
    /**
     * Create a default isometric camera
     */
    static createDefaultCamera(): IsoCamera;
    /**
     * Get tile collision data at world position
     */
    static getTileCollision(worldX: number, worldY: number, map: number[][], elevation: number[][], tileSize: Vector2): TileCollision | null;
}
/**
 * Isometric render module implementation
 */
export declare class IsoRenderModule implements RenderModule {
    name: string;
    nodeTypes: string[];
    private tilesetCache;
    private defaultCamera;
    constructor();
    render(node: Node, context: RenderContext): void;
    private getIsoData;
    private getIsoCamera;
    private getTileset;
    private renderPlaceholder;
    private renderIsoTilemap;
    private renderTile;
    private drawTileDiamond;
}
/**
 * Isometric module definition for registration
 */
export declare const IsoModuleDefinition: ModuleDefinition;
/**
 * Register the isometric module
 */
export declare function registerIsoModule(): void;
//# sourceMappingURL=iso.d.ts.map