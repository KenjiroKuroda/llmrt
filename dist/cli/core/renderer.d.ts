/**
 * Optimized canvas rendering system for the LLM Canvas Engine
 */
import { Node, ThemeTokens, Vector2 } from '../types/core.js';
import { RenderModule, Camera2D, Viewport } from '../types/modules.js';
import { PerformanceMonitor } from './performance-monitor.js';
import { MemoryManager } from './memory-manager.js';
import { AccessibilityManager } from './accessibility-manager.js';
export interface RenderStats {
    drawCalls: number;
    triangles: number;
    sprites: number;
    renderTime: number;
    culledNodes: number;
    batchedSprites: number;
}
/**
 * Optimized canvas renderer with performance monitoring and quality adjustment
 */
export declare class Renderer {
    private canvas;
    private ctx;
    private offscreenCanvas?;
    private offscreenCtx?;
    private theme;
    private camera;
    private viewport;
    private modules;
    private nodeTypeToModule;
    private performanceMonitor?;
    private memoryManager?;
    private accessibilityManager?;
    private qualitySettings;
    private renderStats;
    private spriteBatch;
    private maxBatchSize;
    private enableFrustumCulling;
    private enableSpriteBatching;
    constructor(canvas: HTMLCanvasElement, theme: ThemeTokens);
    /**
     * Main render method - renders scene tree with interpolation and optimizations
     */
    render(sceneTree: Node[], interpolation: number): void;
    /**
     * Register a render module for custom node types
     */
    registerModule(module: RenderModule): void;
    /**
     * Update theme tokens
     */
    setTheme(theme: ThemeTokens): void;
    /**
     * Update camera properties
     */
    setCamera(camera: Partial<Camera2D>): void;
    /**
     * Get current viewport information
     */
    getViewport(): Viewport;
    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorld(screenPos: Vector2): Vector2;
    /**
     * Convert world coordinates to screen coordinates
     */
    worldToScreen(worldPos: Vector2): Vector2;
    private renderNode;
    private getInterpolatedWorldTransform;
    private applyTransform;
    private registerCoreRenderers;
    private renderCoreNode;
    private renderSprite;
    private renderText;
    private renderButton;
    private drawRoundedRect;
    private strokeRoundedRect;
    private loadRegisteredModules;
    private setupResponsiveCanvas;
    private setupOffscreenCanvas;
    private optimizeCanvasSettings;
    private detectPlatformOptimizations;
    private detectLowEndDevice;
    private cullNodes;
    private calculateFrustum;
    private isNodeInFrustum;
    private getNodeBounds;
    private renderOptimized;
    private renderWithBatching;
    private canBatchSprite;
    private renderSpriteBatch;
    private getMemoryUsage;
    setPerformanceMonitor(monitor: PerformanceMonitor): void;
    setMemoryManager(manager: MemoryManager): void;
    setAccessibilityManager(manager: AccessibilityManager): void;
    private updateQualitySettings;
    getRenderStats(): RenderStats;
    optimizeForMobile(): void;
    getPerformanceRecommendations(): string[];
    resize(width: number, height: number): void;
}
//# sourceMappingURL=renderer.d.ts.map