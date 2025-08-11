/**
 * Main entry point for the LLM Canvas Engine
 */

import { LLMRTEngineImpl } from './core/engine.js';
import { ModuleRegistry } from './core/module-registry.js';

// Export main engine class
export { LLMRTEngineImpl as LLMRTEngine };

// Export module registry for module registration
export { ModuleRegistry };

// Export all types
export * from './types/index.js';

// Export validation system
export * from './core/validator.js';

// Export asset management system
export * from './core/asset-manager.js';

// Export cartridge loading system
export * from './core/cartridge-loader.js';

// Export scene tree system
export * from './core/scene-tree.js';

// Export game loop system
export * from './core/game-loop.js';

// Export action and trigger systems
export * from './core/action-system.js';
export * from './core/trigger-system.js';

// Export rendering system
export * from './core/renderer.js';

// Export input management system
export * from './core/input-manager.js';
export * from './core/input-integration.js';

// Export audio management system
export * from './core/audio-manager.js';

// Export optional modules
export * from './modules/mode7.js';
export * from './modules/particles.js';

// Factory function for creating engine instances
export function createEngine() {
  return new LLMRTEngineImpl();
}

// Global registration functions for modules
export function registerModule(module: any) {
  const registry = ModuleRegistry.getInstance();
  registry.registerModule(module);
}

export function registerRenderModule(renderModule: any) {
  const registry = ModuleRegistry.getInstance();
  registry.registerRenderModule(renderModule);
}