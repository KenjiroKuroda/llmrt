/**
 * Lightweight audio system for the LLM Canvas Engine
 * Handles SFX and music playback with mobile audio unlock support
 */
import { AudioManager as IAudioManager, AudioAsset } from '../types/core.js';
export declare class AudioManager implements IAudioManager {
    private assets;
    private currentMusic;
    private masterVolume;
    private unlocked;
    private unlockPromise;
    constructor();
    /**
     * Play a sound effect
     */
    playSfx(id: string, volume?: number): void;
    /**
     * Play background music
     */
    playMusic(id: string, loop?: boolean, volume?: number): void;
    /**
     * Stop currently playing music
     */
    stopMusic(): void;
    /**
     * Set master volume for all audio
     */
    setMasterVolume(volume: number): void;
    /**
     * Load audio assets and cache them
     */
    loadAssets(assets: AudioAsset[]): Promise<void>;
    /**
     * Clean up resources
     */
    cleanup(): void;
    /**
     * Check if audio is unlocked (required for mobile)
     */
    isUnlocked(): boolean;
    /**
     * Manually unlock audio (usually called on user interaction)
     */
    unlock(): Promise<void>;
    /**
     * Load a single audio asset
     */
    private loadAsset;
    /**
     * Set up automatic audio unlock on first user interaction
     */
    private setupAutoUnlock;
    /**
     * Remove auto-unlock event listeners
     */
    private removeAutoUnlock;
    /**
     * Handle user interaction for audio unlock
     */
    private handleUserInteraction;
    /**
     * Perform the actual audio unlock
     */
    private performUnlock;
}
//# sourceMappingURL=audio-manager.d.ts.map