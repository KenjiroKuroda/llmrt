/**
 * Particles system module for 2D particle effects
 * Implements particle lifecycle management, physics, and rendering
 */
import { Node } from '../types/core.js';
import { RenderModule, RenderContext, ModuleDefinition, ParticleEmitter, Particle } from '../types/modules.js';
/**
 * Particle system manager for a single emitter
 */
export declare class ParticleSystem {
    private emitter;
    private maxParticles;
    private particles;
    private nextParticleId;
    private emissionAccumulator;
    constructor(emitter: ParticleEmitter, maxParticles: number);
    /**
     * Update particle system - spawn new particles and update existing ones
     */
    update(deltaTime: number): void;
    /**
     * Get all active particles
     */
    getParticles(): Particle[];
    /**
     * Start emitting particles
     */
    startEmit(): void;
    /**
     * Stop emitting particles
     */
    stopEmit(): void;
    /**
     * Emit a burst of particles
     */
    burstEmit(count: number): void;
    /**
     * Clear all particles
     */
    clear(): void;
    /**
     * Update emitter configuration
     */
    updateEmitter(emitter: Partial<ParticleEmitter>): void;
    private updateParticles;
    private removeDeadParticles;
    private spawnParticles;
    private spawnParticle;
    private lerp;
    private lerpColor;
}
/**
 * Particles render module implementation
 */
export declare class ParticlesRenderModule implements RenderModule {
    name: string;
    nodeTypes: string[];
    private particleSystems;
    private textureCache;
    render(node: Node, context: RenderContext): void;
    /**
     * Handle particle actions
     */
    handleAction(nodeId: string, action: string, params: any): void;
    /**
     * Clean up particle system for a node
     */
    cleanup(nodeId: string): void;
    private renderParticles;
    private renderParticle;
    private renderColoredParticle;
    private getTexture;
}
/**
 * Particles module definition for registration
 */
export declare const ParticlesModuleDefinition: ModuleDefinition;
/**
 * Register the particles module
 */
export declare function registerParticlesModule(): void;
//# sourceMappingURL=particles.d.ts.map