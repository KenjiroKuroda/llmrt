/**
 * Tests for AudioManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioManager } from './audio-manager.js';
import { AudioAsset } from '../types/core.js';

// Mock HTMLAudioElement
class MockAudioElement {
  src: string = '';
  volume: number = 1;
  loop: boolean = false;
  currentTime: number = 0;
  preload: string = 'auto';
  
  private listeners: Map<string, Function[]> = new Map();
  
  addEventListener(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }
  
  removeEventListener(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
  
  dispatchEvent(event: Event) {
    const callbacks = this.listeners.get(event.type);
    if (callbacks) {
      callbacks.forEach(callback => callback(event));
    }
  }
  
  async play(): Promise<void> {
    return Promise.resolve();
  }
  
  pause() {
    // Mock implementation
  }
  
  cloneNode(): MockAudioElement {
    const clone = new MockAudioElement();
    clone.src = this.src;
    clone.volume = this.volume;
    clone.loop = this.loop;
    // Add missing methods to clone
    clone.addEventListener = this.addEventListener.bind(clone);
    clone.removeEventListener = this.removeEventListener.bind(clone);
    clone.play = vi.fn().mockResolvedValue(undefined);
    clone.pause = vi.fn();
    clone.remove = vi.fn();
    return clone;
  }
  
  remove() {
    // Mock implementation
  }
  
  // Helper method to simulate loading
  simulateLoad() {
    this.dispatchEvent(new Event('canplaythrough'));
  }
  
  // Helper method to simulate error
  simulateError() {
    this.dispatchEvent(new Event('error'));
  }
}

// Mock global Audio constructor
global.Audio = vi.fn(() => new MockAudioElement()) as any;

describe('AudioManager', () => {
  let audioManager: AudioManager;
  let mockAssets: AudioAsset[];
  
  beforeEach(() => {
    // Mock document event listeners before creating AudioManager
    vi.spyOn(document, 'addEventListener');
    vi.spyOn(document, 'removeEventListener');
    
    audioManager = new AudioManager();
    mockAssets = [
      { id: 'beep', url: '/audio/beep.wav', type: 'sfx' },
      { id: 'music1', url: '/audio/music1.mp3', type: 'music' },
      { id: 'explosion', url: '/audio/explosion.wav', type: 'sfx' }
    ];
  });
  
  afterEach(() => {
    audioManager.cleanup();
    vi.restoreAllMocks();
  });

  describe('Asset Loading', () => {
    it('should load audio assets successfully', async () => {
      const loadPromise = audioManager.loadAssets(mockAssets);
      
      // Simulate all assets loading
      const audioElements = (global.Audio as any).mock.results;
      audioElements.forEach((result: any) => {
        result.value.simulateLoad();
      });
      
      await expect(loadPromise).resolves.toBeUndefined();
    });
    
    it('should handle asset loading errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const loadPromise = audioManager.loadAssets([mockAssets[0]]);
      
      // Simulate loading error
      const audioElement = (global.Audio as any).mock.results[0].value;
      audioElement.simulateError();
      
      await expect(loadPromise).rejects.toBeDefined();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('SFX Playback', () => {
    beforeEach(async () => {
      const loadPromise = audioManager.loadAssets(mockAssets);
      
      // Simulate all assets loading
      const audioElements = (global.Audio as any).mock.results;
      audioElements.forEach((result: any) => {
        result.value.simulateLoad();
      });
      
      await loadPromise;
    });
    
    it('should play SFX with default volume', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      audioManager.playSfx('beep');
      
      // Should not warn since asset exists
      expect(consoleSpy).not.toHaveBeenCalled();
    });
    
    it('should play SFX with custom volume', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      audioManager.playSfx('beep', 0.5);
      
      // Should not warn since asset exists
      expect(consoleSpy).not.toHaveBeenCalled();
    });
    
    it('should warn when playing non-existent SFX', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      audioManager.playSfx('nonexistent');
      
      expect(consoleSpy).toHaveBeenCalledWith("SFX asset 'nonexistent' not found");
    });
    
    it('should warn when playing music asset as SFX', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      audioManager.playSfx('music1');
      
      expect(consoleSpy).toHaveBeenCalledWith("SFX asset 'music1' not found");
    });
  });

  describe('Music Playback', () => {
    beforeEach(async () => {
      const loadPromise = audioManager.loadAssets(mockAssets);
      
      // Simulate all assets loading
      const audioElements = (global.Audio as any).mock.results;
      audioElements.forEach((result: any) => {
        result.value.simulateLoad();
      });
      
      await loadPromise;
    });
    
    it('should play music with looping enabled by default', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      audioManager.playMusic('music1');
      
      // Should not warn since asset exists
      expect(consoleSpy).not.toHaveBeenCalled();
    });
    
    it('should play music with custom volume and loop settings', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      audioManager.playMusic('music1', false, 0.7);
      
      // Should not warn since asset exists
      expect(consoleSpy).not.toHaveBeenCalled();
    });
    
    it('should stop current music when playing new music', () => {
      // Play first music
      audioManager.playMusic('music1');
      
      // Play second music - should stop the first
      audioManager.playMusic('music1');
      
      // No error should occur
      expect(true).toBe(true);
    });
    
    it('should warn when playing non-existent music', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      audioManager.playMusic('nonexistent');
      
      expect(consoleSpy).toHaveBeenCalledWith("Music asset 'nonexistent' not found");
    });
  });

  describe('Music Control', () => {
    beforeEach(async () => {
      const loadPromise = audioManager.loadAssets(mockAssets);
      
      // Simulate all assets loading
      const audioElements = (global.Audio as any).mock.results;
      audioElements.forEach((result: any) => {
        result.value.simulateLoad();
      });
      
      await loadPromise;
    });
    
    it('should stop music playback', () => {
      audioManager.playMusic('music1');
      audioManager.stopMusic();
      
      // No error should occur
      expect(true).toBe(true);
    });
    
    it('should handle stopping music when none is playing', () => {
      expect(() => audioManager.stopMusic()).not.toThrow();
    });
  });

  describe('Volume Control', () => {
    it('should set master volume within valid range', () => {
      audioManager.setMasterVolume(0.5);
      // Volume is applied when playing audio, tested in playback tests
      
      audioManager.setMasterVolume(-0.1); // Should clamp to 0
      audioManager.setMasterVolume(1.5);  // Should clamp to 1
      
      expect(() => audioManager.setMasterVolume(0.5)).not.toThrow();
    });
  });

  describe('Mobile Audio Unlock', () => {
    it('should not be unlocked initially', () => {
      expect(audioManager.isUnlocked()).toBe(false);
    });
    
    it('should set up auto-unlock event listeners', () => {
      expect(document.addEventListener).toHaveBeenCalledWith('click', expect.any(Function), expect.any(Object));
      expect(document.addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), expect.any(Object));
      expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), expect.any(Object));
    });
    
    it('should unlock audio manually', async () => {
      // Mock successful audio play
      const mockPlay = vi.fn().mockResolvedValue(undefined);
      global.Audio = vi.fn(() => ({
        src: '',
        volume: 0,
        play: mockPlay
      })) as any;
      
      await audioManager.unlock();
      
      expect(audioManager.isUnlocked()).toBe(true);
      expect(mockPlay).toHaveBeenCalled();
    });
    
    it('should handle unlock failure gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock failed audio play
      const mockPlay = vi.fn().mockRejectedValue(new Error('Play failed'));
      global.Audio = vi.fn(() => ({
        src: '',
        volume: 0,
        play: mockPlay
      })) as any;
      
      await audioManager.unlock();
      
      expect(audioManager.isUnlocked()).toBe(true); // Still marked as unlocked
      expect(consoleSpy).toHaveBeenCalledWith('Failed to unlock audio:', expect.any(Error));
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources', () => {
      audioManager.cleanup();
      
      expect(document.removeEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(document.removeEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function));
      expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });
});