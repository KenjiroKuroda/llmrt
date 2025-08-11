/**
 * Particles system demonstration
 * Shows various particle effects including fire, smoke, explosion, and rain
 */

import { LLMRTEngine } from '../src/core/engine.js';
import { registerParticlesModule } from '../src/modules/particles.js';

// Register the particles module
registerParticlesModule();

// Create demo cartridge with particle effects
const particlesCartridge = {
  version: "1.0",
  metadata: {
    title: "Particles Demo",
    author: "LLMRT Engine",
    description: "Demonstration of the particles system with various effects"
  },
  theme: {
    colors: {
      primary: "#ff6b35",
      secondary: "#f7931e",
      background: "#1a1a2e",
      text: "#ffffff",
      accent: "#16213e"
    },
    font: {
      family: "Arial, sans-serif",
      sizes: {
        small: 12,
        medium: 16,
        large: 24
      }
    },
    spacing: {
      small: 8,
      medium: 16,
      large: 32
    },
    radii: {
      small: 4,
      medium: 8,
      large: 16
    }
  },
  scenes: [
    {
      id: "particles-demo",
      root: {
        id: "root",
        type: "Group",
        transform: {
          position: { x: 0, y: 0 },
          scale: { x: 1, y: 1 },
          rotation: 0,
          skew: { x: 0, y: 0 },
          alpha: 1
        },
        visible: true,
        children: [
          // Fire effect (bottom left)
          {
            id: "fire-particles",
            type: "Particles2D",
            transform: {
              position: { x: 150, y: 450 },
              scale: { x: 1, y: 1 },
              rotation: 0,
              skew: { x: 0, y: 0 },
              alpha: 1
            },
            visible: true,
            children: [],
            actions: [],
            triggers: [
              {
                event: "on.start",
                actions: [
                  {
                    type: "startEmit",
                    params: {}
                  }
                ]
              }
            ],
            emitter: {
              position: { x: 0, y: 0 },
              rate: 50,
              lifetime: 2.0,
              lifetimeVariance: 0.5,
              velocity: { x: 0, y: -80 },
              velocityVariance: { x: 30, y: 20 },
              acceleration: { x: 0, y: -20 },
              scale: 0.8,
              scaleVariance: 0.4,
              rotation: 0,
              rotationSpeed: 1.0,
              color: "#ff4500",
              colorEnd: "#ff0000",
              alpha: 1.0,
              alphaEnd: 0.0,
              enabled: true
            },
            maxParticles: 100,
            blendMode: "additive"
          },
          
          // Smoke effect (bottom center)
          {
            id: "smoke-particles",
            type: "Particles2D",
            transform: {
              position: { x: 400, y: 450 },
              scale: { x: 1, y: 1 },
              rotation: 0,
              skew: { x: 0, y: 0 },
              alpha: 1
            },
            visible: true,
            children: [],
            actions: [],
            triggers: [
              {
                event: "on.start",
                actions: [
                  {
                    type: "startEmit",
                    params: {}
                  }
                ]
              }
            ],
            emitter: {
              position: { x: 0, y: 0 },
              rate: 20,
              lifetime: 4.0,
              lifetimeVariance: 1.0,
              velocity: { x: 0, y: -40 },
              velocityVariance: { x: 20, y: 10 },
              acceleration: { x: 5, y: -10 },
              scale: 1.2,
              scaleVariance: 0.6,
              rotation: 0,
              rotationSpeed: 0.5,
              color: "#666666",
              colorEnd: "#333333",
              alpha: 0.8,
              alphaEnd: 0.0,
              enabled: true
            },
            maxParticles: 80,
            blendMode: "normal"
          },
          
          // Rain effect (top)
          {
            id: "rain-particles",
            type: "Particles2D",
            transform: {
              position: { x: 400, y: 50 },
              scale: { x: 1, y: 1 },
              rotation: 0,
              skew: { x: 0, y: 0 },
              alpha: 1
            },
            visible: true,
            children: [],
            actions: [],
            triggers: [
              {
                event: "on.start",
                actions: [
                  {
                    type: "startEmit",
                    params: {}
                  }
                ]
              }
            ],
            emitter: {
              position: { x: 0, y: 0 },
              rate: 100,
              lifetime: 3.0,
              lifetimeVariance: 0.5,
              velocity: { x: -20, y: 200 },
              velocityVariance: { x: 200, y: 50 },
              acceleration: { x: 0, y: 50 },
              scale: 0.3,
              scaleVariance: 0.1,
              rotation: 0,
              rotationSpeed: 0,
              color: "#87ceeb",
              alpha: 0.7,
              enabled: true
            },
            maxParticles: 200,
            blendMode: "normal"
          },
          
          // Explosion effect (center) - triggered by click
          {
            id: "explosion-particles",
            type: "Particles2D",
            transform: {
              position: { x: 400, y: 300 },
              scale: { x: 1, y: 1 },
              rotation: 0,
              skew: { x: 0, y: 0 },
              alpha: 1
            },
            visible: true,
            children: [],
            actions: [],
            triggers: [
              {
                event: "on.pointer",
                actions: [
                  {
                    type: "burstEmit",
                    params: {
                      count: 50
                    }
                  }
                ]
              }
            ],
            emitter: {
              position: { x: 0, y: 0 },
              rate: 0, // Only burst emission
              lifetime: 1.5,
              lifetimeVariance: 0.5,
              velocity: { x: 0, y: 0 },
              velocityVariance: { x: 150, y: 150 },
              acceleration: { x: 0, y: 98 },
              scale: 1.0,
              scaleVariance: 0.5,
              rotation: 0,
              rotationSpeed: 3.0,
              color: "#ffaa00",
              colorEnd: "#ff0000",
              alpha: 1.0,
              alphaEnd: 0.0,
              enabled: false
            },
            maxParticles: 100,
            blendMode: "additive"
          },
          
          // Sparkles effect (bottom right)
          {
            id: "sparkle-particles",
            type: "Particles2D",
            transform: {
              position: { x: 650, y: 450 },
              scale: { x: 1, y: 1 },
              rotation: 0,
              skew: { x: 0, y: 0 },
              alpha: 1
            },
            visible: true,
            children: [],
            actions: [],
            triggers: [
              {
                event: "on.start",
                actions: [
                  {
                    type: "startEmit",
                    params: {}
                  }
                ]
              }
            ],
            emitter: {
              position: { x: 0, y: 0 },
              rate: 30,
              lifetime: 1.0,
              lifetimeVariance: 0.3,
              velocity: { x: 0, y: -60 },
              velocityVariance: { x: 40, y: 30 },
              acceleration: { x: 0, y: 20 },
              scale: 0.5,
              scaleVariance: 0.3,
              rotation: 0,
              rotationSpeed: 6.0,
              color: "#ffffff",
              alpha: 1.0,
              alphaEnd: 0.0,
              enabled: true
            },
            maxParticles: 60,
            blendMode: "additive"
          },
          
          // Instructions text
          {
            id: "instructions",
            type: "Text",
            transform: {
              position: { x: 400, y: 100 },
              scale: { x: 1, y: 1 },
              rotation: 0,
              skew: { x: 0, y: 0 },
              alpha: 1
            },
            visible: true,
            children: [],
            actions: [],
            triggers: [],
            text: "Particles Demo - Click center for explosion!",
            fontSize: 24,
            color: "#ffffff",
            align: "center"
          },
          
          // Effect labels
          {
            id: "fire-label",
            type: "Text",
            transform: {
              position: { x: 150, y: 500 },
              scale: { x: 1, y: 1 },
              rotation: 0,
              skew: { x: 0, y: 0 },
              alpha: 1
            },
            visible: true,
            children: [],
            actions: [],
            triggers: [],
            text: "Fire",
            fontSize: 16,
            color: "#ff6b35",
            align: "center"
          },
          
          {
            id: "smoke-label",
            type: "Text",
            transform: {
              position: { x: 400, y: 500 },
              scale: { x: 1, y: 1 },
              rotation: 0,
              skew: { x: 0, y: 0 },
              alpha: 1
            },
            visible: true,
            children: [],
            actions: [],
            triggers: [],
            text: "Smoke",
            fontSize: 16,
            color: "#666666",
            align: "center"
          },
          
          {
            id: "sparkle-label",
            type: "Text",
            transform: {
              position: { x: 650, y: 500 },
              scale: { x: 1, y: 1 },
              rotation: 0,
              skew: { x: 0, y: 0 },
              alpha: 1
            },
            visible: true,
            children: [],
            actions: [],
            triggers: [],
            text: "Sparkles",
            fontSize: 16,
            color: "#ffffff",
            align: "center"
          },
          
          {
            id: "rain-label",
            type: "Text",
            transform: {
              position: { x: 400, y: 30 },
              scale: { x: 1, y: 1 },
              rotation: 0,
              skew: { x: 0, y: 0 },
              alpha: 1
            },
            visible: true,
            children: [],
            actions: [],
            triggers: [],
            text: "Rain",
            fontSize: 16,
            color: "#87ceeb",
            align: "center"
          }
        ],
        actions: [],
        triggers: []
      }
    }
  ],
  assets: {
    sprites: [],
    audio: [],
    fonts: []
  },
  variables: {}
};

// Initialize and run the demo
async function runParticlesDemo() {
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  canvas.style.border = '2px solid #333';
  canvas.style.backgroundColor = '#1a1a2e';
  
  // Add to page
  document.body.style.margin = '0';
  document.body.style.padding = '20px';
  document.body.style.backgroundColor = '#0f0f1a';
  document.body.style.fontFamily = 'Arial, sans-serif';
  document.body.style.color = '#ffffff';
  
  // Add title
  const title = document.createElement('h1');
  title.textContent = 'LLMRT Particles System Demo';
  title.style.textAlign = 'center';
  title.style.color = '#ff6b35';
  title.style.marginBottom = '20px';
  document.body.appendChild(title);
  
  // Add description
  const description = document.createElement('p');
  description.innerHTML = `
    This demo showcases the particles system with various effects:<br>
    • <strong>Fire</strong> - Upward flames with additive blending<br>
    • <strong>Smoke</strong> - Slow-moving particles with normal blending<br>
    • <strong>Rain</strong> - Fast downward particles<br>
    • <strong>Sparkles</strong> - Rotating bright particles<br>
    • <strong>Explosion</strong> - Click the center area to trigger a burst effect
  `;
  description.style.textAlign = 'center';
  description.style.marginBottom = '20px';
  description.style.lineHeight = '1.6';
  document.body.appendChild(description);
  
  document.body.appendChild(canvas);
  
  // Add performance info
  const perfInfo = document.createElement('div');
  perfInfo.style.marginTop = '20px';
  perfInfo.style.textAlign = 'center';
  perfInfo.style.fontSize = '14px';
  perfInfo.style.color = '#888';
  document.body.appendChild(perfInfo);
  
  try {
    // Create engine instance
    const engine = new LLMRTEngine(canvas);
    
    // Load and start the cartridge
    await engine.loadCartridge(particlesCartridge as any);
    engine.start();
    
    // Update performance info
    let frameCount = 0;
    let lastTime = performance.now();
    
    function updatePerformanceInfo() {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round(frameCount * 1000 / (currentTime - lastTime));
        perfInfo.textContent = `Performance: ${fps} FPS | Click center area for explosion effect`;
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(updatePerformanceInfo);
    }
    
    updatePerformanceInfo();
    
    console.log('Particles demo started successfully!');
    console.log('Effects running:');
    console.log('- Fire particles (bottom left)');
    console.log('- Smoke particles (bottom center)');
    console.log('- Rain particles (top)');
    console.log('- Sparkle particles (bottom right)');
    console.log('- Explosion particles (click center to trigger)');
    
  } catch (error) {
    console.error('Failed to start particles demo:', error);
    
    // Show error message
    const errorDiv = document.createElement('div');
    errorDiv.style.color = '#ff4444';
    errorDiv.style.textAlign = 'center';
    errorDiv.style.marginTop = '20px';
    errorDiv.style.padding = '20px';
    errorDiv.style.border = '2px solid #ff4444';
    errorDiv.style.borderRadius = '8px';
    errorDiv.innerHTML = `
      <h3>Demo Error</h3>
      <p>Failed to start particles demo: ${error.message}</p>
      <p>Please check the console for more details.</p>
    `;
    document.body.appendChild(errorDiv);
  }
}

// Start the demo when the page loads
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runParticlesDemo);
  } else {
    runParticlesDemo();
  }
}

export { runParticlesDemo };