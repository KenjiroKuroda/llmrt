/**
 * Module registration system for tree-shakeable architecture
 */

import { ModuleDefinition, RenderModule } from '../types/modules.js';
import { ActionType, TriggerEvent } from '../types/actions.js';

export class ModuleRegistry {
  private static instance: ModuleRegistry;
  private modules = new Map<string, ModuleDefinition>();
  private renderModules = new Map<string, RenderModule>();
  private actionHandlers = new Map<ActionType, (params: any, context?: any) => void>();
  private triggerEvents = new Set<TriggerEvent>();

  static getInstance(): ModuleRegistry {
    if (!ModuleRegistry.instance) {
      ModuleRegistry.instance = new ModuleRegistry();
    }
    return ModuleRegistry.instance;
  }

  registerModule(module: ModuleDefinition): void {
    this.modules.set(module.name, module);
    
    // Register node types
    module.nodeTypes.forEach(_nodeType => {
      // Node type registration will be handled by the scene tree system
    });

    // Register actions
    module.actions.forEach(_action => {
      // Action registration will be handled by the action system
    });

    // Register triggers
    module.triggers.forEach(trigger => {
      this.triggerEvents.add(trigger as TriggerEvent);
    });
  }

  registerRenderModule(renderModule: RenderModule): void {
    this.renderModules.set(renderModule.name, renderModule);
  }

  registerActionHandler(actionType: ActionType, handler: (params: any, context?: any) => void): void {
    this.actionHandlers.set(actionType, handler);
  }

  getModule(name: string): ModuleDefinition | undefined {
    return this.modules.get(name);
  }

  getRenderModule(name: string): RenderModule | undefined {
    return this.renderModules.get(name);
  }

  getRenderModulesForNodeType(nodeType: string): RenderModule[] {
    return Array.from(this.renderModules.values())
      .filter(module => module.nodeTypes.includes(nodeType));
  }

  getActionHandler(actionType: ActionType): ((params: any, context?: any) => void) | undefined {
    return this.actionHandlers.get(actionType);
  }

  isRegisteredModule(name: string): boolean {
    return this.modules.has(name);
  }

  getRegisteredModules(): ModuleDefinition[] {
    return Array.from(this.modules.values());
  }

  getRenderModules(): RenderModule[] {
    return Array.from(this.renderModules.values());
  }

  getEstimatedSize(): number {
    return Array.from(this.modules.values())
      .reduce((total, module) => total + module.size, 0);
  }

  supportsNodeType(nodeType: string): boolean {
    // Core node types are always supported
    const coreNodeTypes = ['Group', 'Sprite', 'Text', 'Button', 'Camera2D', 'Particles2D', 'PostChain'];
    if (coreNodeTypes.includes(nodeType)) {
      return true;
    }

    // Check if any registered module supports this node type
    return Array.from(this.modules.values())
      .some(module => module.nodeTypes.includes(nodeType));
  }

  supportsTriggerEvent(event: TriggerEvent): boolean {
    // Core trigger events are always supported
    const coreTriggerEvents: TriggerEvent[] = ['on.start', 'on.tick', 'on.key', 'on.pointer', 'on.timer'];
    if (coreTriggerEvents.includes(event)) {
      return true;
    }

    // Check if any registered module supports this trigger event
    return this.triggerEvents.has(event);
  }
}