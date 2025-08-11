/**
 * Core LLMRTEngine implementation
 */

import { LLMRTEngine, EngineState, LGFCartridge, InputManager, AudioManager } from '../types/core.js';
import { ModuleRegistry } from './module-registry.js';
import { InputManagerImpl } from './input-manager.js';
import { AudioManager as AudioManagerImpl } from './audio-manager.js';
import { CartridgeLoader, CartridgeLoadOptions, CartridgeLoadProgress } from './cartridge-loader.js';
import { AssetManager } from './asset-manager.js';
import { AccessibilityManager, AccessibilityOptions } from './accessibility-manager.js';

export class LLMRTEngineImpl implements LLMRTEngine {
  private state: EngineState = {
    running: false,
    paused: false,
    currentScene: null,
    tickCount: 0,
    frameRate: 0
  };

  private cartridge: LGFCartridge | null = null;
  private moduleRegistry: ModuleRegistry;
  private inputManager: InputManager;
  private audioManager: AudioManager;
  private assetManager: AssetManager;
  private cartridgeLoader: CartridgeLoader;
  private accessibilityManager: AccessibilityManager;

  constructor(accessibilityOptions?: Partial<AccessibilityOptions>) {
    this.moduleRegistry = ModuleRegistry.getInstance();
    this.inputManager = new InputManagerImpl();
    this.audioManager = new AudioManagerImpl();
    this.assetManager = new AssetManager();
    this.cartridgeLoader = new CartridgeLoader(this.assetManager, this.audioManager);
    this.accessibilityManager = new AccessibilityManager(accessibilityOptions);
  }

  async loadCartridge(cartridge: LGFCartridge, options?: CartridgeLoadOptions): Promise<void> {
    // Use the cartridge loader for comprehensive loading
    const result = await this.cartridgeLoader.loadFromJSON(JSON.stringify(cartridge), options);
    
    // Validate that all node types are supported
    for (const scene of result.cartridge.scenes) {
      this.validateNodeTree(scene.root);
    }

    this.cartridge = result.cartridge;
    
    // Set initial scene if available
    if (result.cartridge.scenes.length > 0) {
      this.state.currentScene = result.cartridge.scenes[0].id;
    }
  }

  /**
   * Load cartridge from JSON string
   */
  async loadCartridgeFromJSON(jsonString: string, options?: CartridgeLoadOptions): Promise<void> {
    const result = await this.cartridgeLoader.loadFromJSON(jsonString, options);
    
    // Validate that all node types are supported
    for (const scene of result.cartridge.scenes) {
      this.validateNodeTree(scene.root);
    }

    this.cartridge = result.cartridge;
    
    // Set initial scene if available
    if (result.cartridge.scenes.length > 0) {
      this.state.currentScene = result.cartridge.scenes[0].id;
    }
  }

  /**
   * Load cartridge from URL
   */
  async loadCartridgeFromURL(url: string, options?: CartridgeLoadOptions): Promise<void> {
    const result = await this.cartridgeLoader.loadFromURL(url, options);
    
    // Validate that all node types are supported
    for (const scene of result.cartridge.scenes) {
      this.validateNodeTree(scene.root);
    }

    this.cartridge = result.cartridge;
    
    // Set initial scene if available
    if (result.cartridge.scenes.length > 0) {
      this.state.currentScene = result.cartridge.scenes[0].id;
    }
  }

  /**
   * Load cartridge from File object
   */
  async loadCartridgeFromFile(file: File, options?: CartridgeLoadOptions): Promise<void> {
    const result = await this.cartridgeLoader.loadFromFile(file, options);
    
    // Validate that all node types are supported
    for (const scene of result.cartridge.scenes) {
      this.validateNodeTree(scene.root);
    }

    this.cartridge = result.cartridge;
    
    // Set initial scene if available
    if (result.cartridge.scenes.length > 0) {
      this.state.currentScene = result.cartridge.scenes[0].id;
    }
  }

  start(): void {
    if (!this.cartridge) {
      throw new Error('No cartridge loaded');
    }

    this.state.running = true;
    this.state.paused = false;
    this.state.tickCount = 0;
  }

  stop(): void {
    this.state.running = false;
    this.state.paused = false;
    this.state.tickCount = 0;
    this.audioManager.stopMusic();
  }

  pause(): void {
    if (this.state.running) {
      this.state.paused = true;
    }
  }

  resume(): void {
    if (this.state.running) {
      this.state.paused = false;
    }
  }

  getState(): EngineState {
    return { ...this.state };
  }

  getInputManager(): InputManager {
    return this.inputManager;
  }

  getAudioManager(): AudioManager {
    return this.audioManager;
  }

  /**
   * Get asset manager instance
   */
  getAssetManager(): AssetManager {
    return this.assetManager;
  }

  /**
   * Get cartridge loader instance
   */
  getCartridgeLoader(): CartridgeLoader {
    return this.cartridgeLoader;
  }

  /**
   * Get accessibility manager instance
   */
  getAccessibilityManager(): AccessibilityManager {
    return this.accessibilityManager;
  }

  private validateNodeTree(node: any): void {
    if (!node.type || !this.moduleRegistry.supportsNodeType(node.type)) {
      throw new Error(`Unsupported node type: ${node.type}`);
    }

    // Validate triggers
    if (node.triggers && Array.isArray(node.triggers)) {
      for (const trigger of node.triggers) {
        if (!this.moduleRegistry.supportsTriggerEvent(trigger.event)) {
          throw new Error(`Unsupported trigger event: ${trigger.event}`);
        }
      }
    }

    // Recursively validate children
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        this.validateNodeTree(child);
      }
    }
  }
}