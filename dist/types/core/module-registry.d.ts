/**
 * Module registration system for tree-shakeable architecture
 */
import { ModuleDefinition, RenderModule } from '../types/modules.js';
import { ActionType, TriggerEvent } from '../types/actions.js';
export declare class ModuleRegistry {
    private static instance;
    private modules;
    private renderModules;
    private actionHandlers;
    private triggerEvents;
    static getInstance(): ModuleRegistry;
    registerModule(module: ModuleDefinition): void;
    registerRenderModule(renderModule: RenderModule): void;
    registerActionHandler(actionType: ActionType, handler: (params: any, context?: any) => void): void;
    getModule(name: string): ModuleDefinition | undefined;
    getRenderModule(name: string): RenderModule | undefined;
    getRenderModulesForNodeType(nodeType: string): RenderModule[];
    getActionHandler(actionType: ActionType): ((params: any, context?: any) => void) | undefined;
    isRegisteredModule(name: string): boolean;
    getRegisteredModules(): ModuleDefinition[];
    getRenderModules(): RenderModule[];
    getEstimatedSize(): number;
    supportsNodeType(nodeType: string): boolean;
    supportsTriggerEvent(event: TriggerEvent): boolean;
}
//# sourceMappingURL=module-registry.d.ts.map