/**
 * Post-processing effects module for visual enhancement
 * Implements vignette, bloom-lite, and color grading effects
 */
import { Node } from '../types/core.js';
import { RenderModule, RenderContext, ModuleDefinition } from '../types/modules.js';
/**
 * Post-processing effect types
 */
export type PostEffectType = 'vignette' | 'bloom-lite' | 'color-grading';
/**
 * Base interface for all post-processing effects
 */
export interface PostEffect {
    type: PostEffectType;
    enabled: boolean;
    intensity: number;
}
/**
 * Vignette effect parameters
 */
export interface VignetteEffect extends PostEffect {
    type: 'vignette';
    radius: number;
    softness: number;
    color: string;
}
/**
 * Bloom-lite effect parameters
 */
export interface BloomLiteEffect extends PostEffect {
    type: 'bloom-lite';
    threshold: number;
    radius: number;
    strength: number;
}
/**
 * Color grading effect parameters
 */
export interface ColorGradingEffect extends PostEffect {
    type: 'color-grading';
    brightness: number;
    contrast: number;
    saturation: number;
    hue: number;
    gamma: number;
}
/**
 * PostChain node data
 */
export interface PostChainData {
    effects: PostEffect[];
    renderTarget?: string;
}
/**
 * PostChain node type
 */
export interface PostChainNode extends Node {
    type: 'PostChain';
    effects: PostEffect[];
    renderTarget?: string;
}
/**
 * Framebuffer management for multi-pass rendering
 */
export declare class FramebufferManager {
    private buffers;
    private contexts;
    /**
     * Create or get a framebuffer with specified dimensions
     */
    getFramebuffer(id: string, width: number, height: number): {
        canvas: HTMLCanvasElement;
        ctx: CanvasRenderingContext2D;
    };
    /**
     * Clear a framebuffer
     */
    clearFramebuffer(id: string): void;
    /**
     * Copy content from one framebuffer to another
     */
    copyFramebuffer(sourceId: string, targetId: string): void;
    /**
     * Cleanup all framebuffers
     */
    cleanup(): void;
}
/**
 * Post-processing effects renderer
 */
export declare class PostFXRenderer {
    private framebufferManager;
    /**
     * Apply vignette effect
     */
    applyVignette(sourceCanvas: HTMLCanvasElement, targetCtx: CanvasRenderingContext2D, effect: VignetteEffect): void;
    /**
     * Apply bloom-lite effect (simplified bloom)
     */
    applyBloomLite(sourceCanvas: HTMLCanvasElement, targetCtx: CanvasRenderingContext2D, effect: BloomLiteEffect): void;
    /**
     * Apply color grading effect
     */
    applyColorGrading(sourceCanvas: HTMLCanvasElement, targetCtx: CanvasRenderingContext2D, effect: ColorGradingEffect): void;
    /**
     * Extract bright pixels above threshold
     */
    private extractBrightPixels;
    /**
     * Apply simple box blur
     */
    private applyBoxBlur;
    /**
     * Process a single pixel with color grading
     */
    private processPixel;
    /**
     * Convert RGB to HSV
     */
    private rgbToHsv;
    /**
     * Convert HSV to RGB
     */
    private hsvToRgb;
    /**
     * Convert hex color to RGBA string
     */
    private hexToRgba;
    /**
     * Linear interpolation
     */
    private lerp;
    /**
     * Cleanup resources
     */
    cleanup(): void;
} /**

 * PostFX render module implementation
 */
export declare class PostFXRenderModule implements RenderModule {
    name: string;
    nodeTypes: string[];
    private renderer;
    private framebufferManager;
    render(node: Node, context: RenderContext): void;
    private getPostChainData;
    /**
     * Create default effects
     */
    static createVignetteEffect(params?: Partial<VignetteEffect>): VignetteEffect;
    static createBloomLiteEffect(params?: Partial<BloomLiteEffect>): BloomLiteEffect;
    static createColorGradingEffect(params?: Partial<ColorGradingEffect>): ColorGradingEffect;
    /**
     * Cleanup resources
     */
    cleanup(): void;
}
/**
 * PostFX module definition for registration
 */
export declare const PostFXModuleDefinition: ModuleDefinition;
/**
 * Register the PostFX module
 */
export declare function registerPostFXModule(): void;
//# sourceMappingURL=postfx.d.ts.map