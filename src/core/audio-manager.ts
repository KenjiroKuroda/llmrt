/**
 * Lightweight audio system for the LLM Canvas Engine
 * Handles SFX and music playback with mobile audio unlock support
 */

import { AudioManager as IAudioManager, AudioAsset } from '../types/core.js';

interface LoadedAudioAsset {
  id: string;
  audio: HTMLAudioElement;
  type: 'sfx' | 'music';
}

export class AudioManager implements IAudioManager {
  private assets: Map<string, LoadedAudioAsset> = new Map();
  private currentMusic: HTMLAudioElement | null = null;
  private masterVolume: number = 1.0;
  private unlocked: boolean = false;
  private unlockPromise: Promise<void> | null = null;

  constructor() {
    // Bind methods to preserve context
    this.handleUserInteraction = this.handleUserInteraction.bind(this);
    
    // Set up auto-unlock on first user interaction
    this.setupAutoUnlock();
  }

  /**
   * Play a sound effect
   */
  playSfx(id: string, volume: number = 1.0): void {
    const asset = this.assets.get(id);
    if (!asset || asset.type !== 'sfx') {
      console.warn(`SFX asset '${id}' not found`);
      return;
    }

    // Clone the audio element for overlapping playback
    const audio = asset.audio.cloneNode() as HTMLAudioElement;
    audio.volume = Math.max(0, Math.min(1, volume * this.masterVolume));
    
    // Clean up after playback
    audio.addEventListener('ended', () => {
      audio.remove();
    });

    // Play if unlocked, otherwise queue for unlock
    if (this.unlocked) {
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(error => {
          console.warn(`Failed to play SFX '${id}':`, error);
        });
      }
    } else {
      this.unlock().then(() => {
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(error => {
            console.warn(`Failed to play SFX '${id}':`, error);
          });
        }
      });
    }
  }

  /**
   * Play background music
   */
  playMusic(id: string, loop: boolean = true, volume: number = 1.0): void {
    const asset = this.assets.get(id);
    if (!asset || asset.type !== 'music') {
      console.warn(`Music asset '${id}' not found`);
      return;
    }

    // Stop current music if playing
    this.stopMusic();

    // Set up new music
    this.currentMusic = asset.audio.cloneNode() as HTMLAudioElement;
    this.currentMusic.loop = loop;
    this.currentMusic.volume = Math.max(0, Math.min(1, volume * this.masterVolume));

    // Play if unlocked, otherwise queue for unlock
    if (this.unlocked) {
      const playPromise = this.currentMusic.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(error => {
          console.warn(`Failed to play music '${id}':`, error);
        });
      }
    } else {
      this.unlock().then(() => {
        if (this.currentMusic) {
          const playPromise = this.currentMusic.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(error => {
              console.warn(`Failed to play music '${id}':`, error);
            });
          }
        }
      });
    }
  }

  /**
   * Stop currently playing music
   */
  stopMusic(): void {
    if (this.currentMusic) {
      this.currentMusic.pause();
      this.currentMusic.currentTime = 0;
      this.currentMusic = null;
    }
  }

  /**
   * Set master volume for all audio
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    
    // Update current music volume
    if (this.currentMusic) {
      this.currentMusic.volume = this.currentMusic.volume * this.masterVolume;
    }
  }

  /**
   * Load audio assets and cache them
   */
  async loadAssets(assets: AudioAsset[]): Promise<void> {
    const loadPromises = assets.map(asset => this.loadAsset(asset));
    await Promise.all(loadPromises);
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stopMusic();
    this.assets.clear();
    this.removeAutoUnlock();
  }

  /**
   * Check if audio is unlocked (required for mobile)
   */
  isUnlocked(): boolean {
    return this.unlocked;
  }

  /**
   * Manually unlock audio (usually called on user interaction)
   */
  async unlock(): Promise<void> {
    if (this.unlocked) {
      return;
    }

    if (this.unlockPromise) {
      return this.unlockPromise;
    }

    this.unlockPromise = this.performUnlock();
    return this.unlockPromise;
  }

  /**
   * Load a single audio asset
   */
  private async loadAsset(asset: AudioAsset): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      
      audio.addEventListener('canplaythrough', () => {
        this.assets.set(asset.id, {
          id: asset.id,
          audio,
          type: asset.type
        });
        resolve();
      });

      audio.addEventListener('error', (error) => {
        console.warn(`Failed to load audio asset '${asset.id}':`, error);
        reject(error);
      });

      // Set up audio element
      audio.preload = 'auto';
      audio.src = asset.url;
    });
  }

  /**
   * Set up automatic audio unlock on first user interaction
   */
  private setupAutoUnlock(): void {
    // Listen for various user interaction events
    const events = ['click', 'touchstart', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, this.handleUserInteraction, { once: true, passive: true });
    });
  }

  /**
   * Remove auto-unlock event listeners
   */
  private removeAutoUnlock(): void {
    const events = ['click', 'touchstart', 'keydown'];
    events.forEach(event => {
      document.removeEventListener(event, this.handleUserInteraction);
    });
  }

  /**
   * Handle user interaction for audio unlock
   */
  private handleUserInteraction(): void {
    this.unlock();
  }

  /**
   * Perform the actual audio unlock
   */
  private async performUnlock(): Promise<void> {
    try {
      // Create a silent audio element and try to play it
      const silentAudio = new Audio();
      silentAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmHgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
      silentAudio.volume = 0;
      
      await silentAudio.play();
      
      this.unlocked = true;
      this.removeAutoUnlock();
      
      console.log('Audio unlocked successfully');
    } catch (error) {
      console.warn('Failed to unlock audio:', error);
      // Still mark as unlocked to avoid repeated attempts
      this.unlocked = true;
    } finally {
      this.unlockPromise = null;
    }
  }
}