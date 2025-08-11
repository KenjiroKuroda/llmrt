/**
 * Audio system demonstration
 */

import { AudioManager } from '../src/core/audio-manager.js';
import { AudioAsset } from '../src/types/core.js';

// Create audio manager instance
const audioManager = new AudioManager();

// Mock audio assets for demonstration
const mockAssets: AudioAsset[] = [
  { id: 'beep', url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmHgU7k9n1unEiBC13yO/eizEIHWq+8+OWT', type: 'sfx' },
  { id: 'background', url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmHgU7k9n1unEiBC13yO/eizEIHWq+8+OWT', type: 'music' }
];

async function runAudioDemo() {
  console.log('🎵 Audio System Demo');
  console.log('==================');
  
  try {
    // Load audio assets
    console.log('Loading audio assets...');
    await audioManager.loadAssets(mockAssets);
    console.log('✅ Audio assets loaded successfully');
    
    // Check unlock status
    console.log(`Audio unlocked: ${audioManager.isUnlocked()}`);
    
    // Set master volume
    console.log('Setting master volume to 0.8');
    audioManager.setMasterVolume(0.8);
    
    // Play SFX
    console.log('Playing SFX: beep');
    audioManager.playSfx('beep', 0.5);
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Play background music
    console.log('Playing background music');
    audioManager.playMusic('background', true, 0.3);
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Stop music
    console.log('Stopping background music');
    audioManager.stopMusic();
    
    // Play another SFX
    console.log('Playing SFX again');
    audioManager.playSfx('beep', 1.0);
    
    console.log('✅ Audio demo completed successfully');
    
  } catch (error) {
    console.error('❌ Audio demo failed:', error);
  } finally {
    // Cleanup
    audioManager.cleanup();
    console.log('🧹 Audio manager cleaned up');
  }
}

// Run the demo
runAudioDemo();

// Export for potential use in other demos
export { audioManager, mockAssets };