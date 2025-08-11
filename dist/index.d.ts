/**
 * Main entry point for the LLM Canvas Engine
 */
import { LLMRTEngineImpl } from './core/engine.js';
import { ModuleRegistry } from './core/module-registry.js';
export { LLMRTEngineImpl as LLMRTEngine };
export { ModuleRegistry };
export * from './types/index.js';
export * from './core/validator.js';
export * from './core/asset-manager.js';
export * from './core/cartridge-loader.js';
export * from './core/scene-tree.js';
export * from './core/game-loop.js';
export * from './core/action-system.js';
export * from './core/trigger-system.js';
export * from './core/renderer.js';
export * from './core/input-manager.js';
export * from './core/input-integration.js';
export * from './core/audio-manager.js';
export * from './modules/mode7.js';
export * from './modules/particles.js';
export declare function createEngine(): LLMRTEngineImpl;
export declare function registerModule(module: any): void;
export declare function registerRenderModule(renderModule: any): void;
//# sourceMappingURL=index.d.ts.map