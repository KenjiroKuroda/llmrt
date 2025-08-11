/**
 * Particles system module for 2D particle effects
 * Implements particle lifecycle management, physics, and rendering
 */

import { Node, Vector2 } from '../types/core.js';
import { RenderModule, RenderContext, ModuleDefinition, Particles2DNode, ParticleEmitter, Particle } from '../types/modules.js';
import { ModuleRegistry } from '../core/module-registry.js';

/**
 * Particle system manager for a single emitter
 */
export class ParticleSystem {
  private particles: Particle[] = [];
  private nextParticleId = 0;
  private emissionAccumulator = 0;

  constructor(
    private emitter: ParticleEmitter,
    private maxParticles: number
  ) {}

  /**
   * Update particle system - spawn new particles and update existing ones
   */
  update(deltaTime: number): void {
    // Update existing particles
    this.updateParticles(deltaTime);

    // Remove dead particles
    this.removeDeadParticles();

    // Spawn new particles if emitter is enabled
    if (this.emitter.enabled && this.particles.length < this.maxParticles) {
      this.spawnParticles(deltaTime);
    }
  }

  /**
   * Get all active particles
   */
  getParticles(): Particle[] {
    return this.particles;
  }

  /**
   * Start emitting particles
   */
  startEmit(): void {
    this.emitter.enabled = true;
  }

  /**
   * Stop emitting particles
   */
  stopEmit(): void {
    this.emitter.enabled = false;
  }

  /**
   * Emit a burst of particles
   */
  burstEmit(count: number): void {
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      this.spawnParticle();
    }
  }

  /**
   * Clear all particles
   */
  clear(): void {
    this.particles.length = 0;
  }

  /**
   * Update emitter configuration
   */
  updateEmitter(emitter: Partial<ParticleEmitter>): void {
    Object.assign(this.emitter, emitter);
  }

  private updateParticles(deltaTime: number): void {
    for (const particle of this.particles) {
      // Update age
      particle.age += deltaTime;

      // Update physics
      particle.velocity.x += particle.acceleration.x * deltaTime;
      particle.velocity.y += particle.acceleration.y * deltaTime;
      particle.position.x += particle.velocity.x * deltaTime;
      particle.position.y += particle.velocity.y * deltaTime;

      // Update rotation
      particle.rotation += particle.rotationSpeed * deltaTime;

      // Update lifetime-based properties
      const lifetimeRatio = particle.age / particle.maxLifetime;
      
      // Interpolate alpha if end alpha is specified
      if (particle.alphaEnd !== undefined) {
        particle.alpha = this.lerp(particle.alpha, particle.alphaEnd, lifetimeRatio);
      }

      // Interpolate color if end color is specified
      if (particle.colorEnd) {
        particle.color = this.lerpColor(particle.color, particle.colorEnd, lifetimeRatio);
      }
    }
  }

  private removeDeadParticles(): void {
    this.particles = this.particles.filter(particle => particle.age < particle.maxLifetime);
  }

  private spawnParticles(deltaTime: number): void {
    // Only spawn if rate is greater than 0
    if (this.emitter.rate <= 0) {
      return;
    }

    // Accumulate emission time
    this.emissionAccumulator += deltaTime * this.emitter.rate;

    // Spawn particles based on accumulated time
    while (this.emissionAccumulator >= 1 && this.particles.length < this.maxParticles) {
      this.spawnParticle();
      this.emissionAccumulator -= 1;
    }
  }

  private spawnParticle(): void {
    // Calculate lifetime with variance
    const lifetime = this.emitter.lifetime + 
      (Math.random() - 0.5) * 2 * this.emitter.lifetimeVariance;

    // Calculate initial velocity with variance
    const velocity = {
      x: this.emitter.velocity.x + (Math.random() - 0.5) * 2 * this.emitter.velocityVariance.x,
      y: this.emitter.velocity.y + (Math.random() - 0.5) * 2 * this.emitter.velocityVariance.y
    };

    // Calculate initial scale with variance
    const scale = this.emitter.scale + (Math.random() - 0.5) * 2 * this.emitter.scaleVariance;

    const particle: Particle = {
      id: this.nextParticleId++,
      position: { ...this.emitter.position },
      velocity,
      acceleration: { ...this.emitter.acceleration },
      scale: Math.max(0.1, scale), // Ensure minimum scale
      rotation: this.emitter.rotation,
      rotationSpeed: this.emitter.rotationSpeed,
      color: this.emitter.color,
      colorEnd: this.emitter.colorEnd,
      alpha: this.emitter.alpha,
      alphaEnd: this.emitter.alphaEnd,
      lifetime: Math.max(0.1, lifetime), // Ensure minimum lifetime
      maxLifetime: Math.max(0.1, lifetime),
      age: 0
    };

    this.particles.push(particle);
  }

  private lerp(start: number, end: number, t: number): number {
    return start + (end - start) * Math.min(1, Math.max(0, t));
  }

  private lerpColor(startColor: string, endColor: string, t: number): string {
    // Simple color interpolation - in a full implementation, this would handle RGB/HSL properly
    // For now, return the start color
    return t > 0.5 ? endColor : startColor;
  }
}

/**
 * Particles render module implementation
 */
export class ParticlesRenderModule implements RenderModule {
  name = 'particles';
  nodeTypes = ['Particles2D'];
  
  private particleSystems = new Map<string, ParticleSystem>();
  private textureCache = new Map<string, HTMLImageElement>();

  render(node: Node, context: RenderContext): void {
    const particlesNode = node as Particles2DNode;
    
    // Get or create particle system for this node
    let particleSystem = this.particleSystems.get(node.id);
    if (!particleSystem) {
      particleSystem = new ParticleSystem(particlesNode.emitter, particlesNode.maxParticles);
      this.particleSystems.set(node.id, particleSystem);
    }

    // Update particle system
    const deltaTime = 1 / 60; // Fixed timestep - in full implementation, get from game loop
    particleSystem.update(deltaTime);

    // Render particles
    this.renderParticles(particleSystem.getParticles(), particlesNode, context);
  }

  /**
   * Handle particle actions
   */
  handleAction(nodeId: string, action: string, params: any): void {
    let particleSystem = this.particleSystems.get(nodeId);
    
    // Create particle system if it doesn't exist for certain actions
    if (!particleSystem && (action === 'startEmit' || action === 'burstEmit')) {
      // Create a default particle system
      const defaultEmitter = {
        position: { x: 0, y: 0 },
        rate: 10,
        lifetime: 1.0,
        lifetimeVariance: 0,
        velocity: { x: 0, y: 0 },
        velocityVariance: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        scale: 1.0,
        scaleVariance: 0,
        rotation: 0,
        rotationSpeed: 0,
        color: '#ffffff',
        alpha: 1.0,
        enabled: true
      };
      particleSystem = new ParticleSystem(defaultEmitter, 100);
      this.particleSystems.set(nodeId, particleSystem);
    }
    
    if (!particleSystem) {
      console.warn(`No particle system found for node ${nodeId}`);
      return;
    }

    switch (action) {
      case 'startEmit':
        particleSystem.startEmit();
        break;
      case 'stopEmit':
        particleSystem.stopEmit();
        break;
      case 'burstEmit':
        particleSystem.burstEmit(params.count || 10);
        break;
      default:
        console.warn(`Unknown particle action: ${action}`);
    }
  }

  /**
   * Clean up particle system for a node
   */
  cleanup(nodeId: string): void {
    this.particleSystems.delete(nodeId);
  }

  private renderParticles(particles: Particle[], node: Particles2DNode, context: RenderContext): void {
    const { ctx } = context;
    
    // Set blend mode
    const oldCompositeOperation = ctx.globalCompositeOperation;
    if (node.blendMode) {
      switch (node.blendMode) {
        case 'additive':
          ctx.globalCompositeOperation = 'lighter';
          break;
        case 'multiply':
          ctx.globalCompositeOperation = 'multiply';
          break;
        default:
          ctx.globalCompositeOperation = 'source-over';
      }
    }

    // Render each particle
    for (const particle of particles) {
      this.renderParticle(particle, node, context);
    }

    // Restore blend mode
    ctx.globalCompositeOperation = oldCompositeOperation;
  }

  private renderParticle(particle: Particle, node: Particles2DNode, context: RenderContext): void {
    const { ctx } = context;
    
    ctx.save();

    // Apply particle transform
    ctx.translate(particle.position.x, particle.position.y);
    ctx.rotate(particle.rotation);
    ctx.scale(particle.scale, particle.scale);
    ctx.globalAlpha = particle.alpha;

    if (node.texture) {
      // Render with texture
      const texture = this.getTexture(node.texture);
      if (texture) {
        ctx.drawImage(texture, -texture.width / 2, -texture.height / 2);
      } else {
        // Fallback to colored rectangle
        this.renderColoredParticle(particle, ctx);
      }
    } else {
      // Render as colored shape
      this.renderColoredParticle(particle, ctx);
    }

    ctx.restore();
  }

  private renderColoredParticle(particle: Particle, ctx: CanvasRenderingContext2D): void {
    const size = 4; // Base particle size
    
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
  }

  private getTexture(textureId: string): HTMLImageElement | null {
    // Check cache first
    if (this.textureCache.has(textureId)) {
      return this.textureCache.get(textureId)!;
    }

    // For now, return null - in a full implementation, this would load the texture
    // TODO: Integrate with asset loading system
    return null;
  }
}

/**
 * Particles module definition for registration
 */
export const ParticlesModuleDefinition: ModuleDefinition = {
  name: 'particles',
  nodeTypes: ['Particles2D'],
  actions: ['startEmit', 'stopEmit', 'burstEmit'],
  triggers: [],
  dependencies: [],
  size: 6 // Estimated KB
};

/**
 * Register the particles module
 */
export function registerParticlesModule(): void {
  const registry = ModuleRegistry.getInstance();
  
  // Register module definition
  registry.registerModule(ParticlesModuleDefinition);
  
  // Register render module
  const renderModule = new ParticlesRenderModule();
  registry.registerRenderModule(renderModule);
  
  // Register action handlers
  registry.registerActionHandler('startEmit', (params: any, context: any) => {
    if (context.nodeId) {
      renderModule.handleAction(context.nodeId, 'startEmit', params);
    }
  });
  
  registry.registerActionHandler('stopEmit', (params: any, context: any) => {
    if (context.nodeId) {
      renderModule.handleAction(context.nodeId, 'stopEmit', params);
    }
  });
  
  registry.registerActionHandler('burstEmit', (params: any, context: any) => {
    if (context.nodeId) {
      renderModule.handleAction(context.nodeId, 'burstEmit', params);
    }
  });
}