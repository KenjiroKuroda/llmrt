/**
 * Core LLMRTEngine implementation
 */
import { LLMRTEngine, EngineState, LGFCartridge, InputManager, AudioManager } from '../types/core.js';
import { CartridgeLoader, CartridgeLoadOptions } from './cartridge-loader.js';
import { AssetManager } from './asset-manager.js';
import { AccessibilityManager, AccessibilityOptions } from './accessibility-manager.js';
export declare class LLMRTEngineImpl implements LLMRTEngine {
    private state;
    private cartridge;
    private moduleRegistry;
    private inputManager;
    private audioManager;
    private assetManager;
    private cartridgeLoader;
    private accessibilityManager;
    constructor(accessibilityOptions?: Partial<AccessibilityOptions>);
    loadCartridge(cartridge: LGFCartridge, options?: CartridgeLoadOptions): Promise<void>;
    /**
     * Load cartridge from JSON string
     */
    loadCartridgeFromJSON(jsonString: string, options?: CartridgeLoadOptions): Promise<void>;
    /**
     * Load cartridge from URL
     */
    loadCartridgeFromURL(url: string, options?: CartridgeLoadOptions): Promise<void>;
    /**
     * Load cartridge from File object
     */
    loadCartridgeFromFile(file: File, options?: CartridgeLoadOptions): Promise<void>;
    start(): void;
    stop(): void;
    pause(): void;
    resume(): void;
    getState(): EngineState;
    getInputManager(): InputManager;
    getAudioManager(): AudioManager;
    /**
     * Get asset manager instance
     */
    getAssetManager(): AssetManager;
    /**
     * Get cartridge loader instance
     */
    getCartridgeLoader(): CartridgeLoader;
    /**
     * Get accessibility manager instance
     */
    getAccessibilityManager(): AccessibilityManager;
    private validateNodeTree;
}
//# sourceMappingURL=engine.d.ts.map