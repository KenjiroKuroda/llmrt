/**
 * Integrated performance monitoring system with automatic quality adjustment
 */

export interface PerformanceBudget {
  maxFrameTime: number; // ms - 16.67 for 60fps
  maxMemoryUsage: number; // MB - 64MB target
  maxActiveSprites: number; // 200 sprites
  maxBillboards: number; // 200 billboards  
  maxFake3DSurfaces: number; // 1 surface
  maxDrawCalls: number; // 100 draw calls
  targetFPS: number; // 60 FPS
}

export interface QualitySettings {
  renderScale: number; // 0.5 - 1.0
  particleDensity: number; // 0.1 - 1.0
  shadowQuality: 'off' | 'low' | 'medium' | 'high';
  textureFiltering: boolean;
  postProcessing: boolean;
  audioQuality: 'low' | 'medium' | 'high';
  maxActiveAudioSources: number;
}

export interface PerformanceState {
  currentFPS: number;
  averageFPS: number;
  frameTime: number;
  memoryUsage: number;
  activeSprites: number;
  drawCalls: number;
  qualityLevel: number; // 0-100
  isThrottling: boolean;
  lastAdjustment: number;
}

export class PerformanceMonitor {
  private budget: PerformanceBudget;
  private qualitySettings: QualitySettings;
  private state: PerformanceState;
  private frameHistory: number[] = [];
  private memoryHistory: number[] = [];
  private adjustmentCooldown = 2000; // 2 seconds between adjustments
  private isEnabled = true;
  private callbacks: {
    onQualityChange?: (settings: QualitySettings) => void;
    onPerformanceAlert?: (alert: string, severity: 'warning' | 'critical') => void;
  } = {};

  constructor(budget?: Partial<PerformanceBudget>) {
    this.budget = {
      maxFrameTime: 16.67, // 60 FPS
      maxMemoryUsage: 64, // MB
      maxActiveSprites: 200,
      maxBillboards: 200,
      maxFake3DSurfaces: 1,
      maxDrawCalls: 100,
      targetFPS: 60,
      ...budget
    };

    this.qualitySettings = {
      renderScale: 1.0,
      particleDensity: 1.0,
      shadowQuality: 'medium',
      textureFiltering: true,
      postProcessing: true,
      audioQuality: 'high',
      maxActiveAudioSources: 8
    };

    this.state = {
      currentFPS: 60,
      averageFPS: 60,
      frameTime: 16.67,
      memoryUsage: 0,
      activeSprites: 0,
      drawCalls: 0,
      qualityLevel: 100,
      isThrottling: false,
      lastAdjustment: 0
    };

    this.detectPlatform();
  }

  private detectPlatform(): void {
    // Adjust defaults based on platform
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLowEnd = this.detectLowEndDevice();

    if (isMobile || isLowEnd) {
      this.budget.maxFrameTime = 20; // Allow slightly lower FPS on mobile
      this.budget.maxMemoryUsage = 32; // Stricter memory limit
      this.budget.maxActiveSprites = 100;
      this.budget.maxDrawCalls = 50;
      
      this.qualitySettings.renderScale = 0.8;
      this.qualitySettings.particleDensity = 0.7;
      this.qualitySettings.shadowQuality = 'low';
      this.qualitySettings.postProcessing = false;
      this.qualitySettings.audioQuality = 'medium';
      this.qualitySettings.maxActiveAudioSources = 4;
      
      this.state.qualityLevel = 70;
    }
  }

  private detectLowEndDevice(): boolean {
    // Simple heuristics for low-end device detection
    const memory = (navigator as any).deviceMemory;
    const cores = navigator.hardwareConcurrency;
    
    if (memory && memory < 4) return true; // Less than 4GB RAM
    if (cores && cores < 4) return true; // Less than 4 CPU cores
    
    return false;
  }

  /**
   * Update performance metrics (called each frame)
   */
  updateMetrics(frameTime: number, memoryUsage: number, activeSprites: number, drawCalls: number): void {
    if (!this.isEnabled) return;

    this.state.frameTime = frameTime;
    this.state.currentFPS = 1000 / frameTime;
    this.state.memoryUsage = memoryUsage;
    this.state.activeSprites = activeSprites;
    this.state.drawCalls = drawCalls;

    // Update frame history for average calculation
    this.frameHistory.push(this.state.currentFPS);
    if (this.frameHistory.length > 60) { // Keep last 60 frames (1 second at 60fps)
      this.frameHistory.shift();
    }

    // Update memory history
    this.memoryHistory.push(memoryUsage);
    if (this.memoryHistory.length > 30) { // Keep last 30 samples
      this.memoryHistory.shift();
    }

    // Calculate average FPS
    this.state.averageFPS = this.frameHistory.reduce((sum, fps) => sum + fps, 0) / this.frameHistory.length;

    // Check if automatic adjustment is needed
    this.checkPerformanceThresholds();
  }

  private checkPerformanceThresholds(): void {
    const now = performance.now();
    if (now - this.state.lastAdjustment < this.adjustmentCooldown) {
      return; // Still in cooldown period
    }

    let needsAdjustment = false;
    let adjustmentDirection = 0; // -1 = reduce quality, +1 = increase quality

    // Check frame time threshold
    if (this.state.frameTime > this.budget.maxFrameTime * 1.2) {
      needsAdjustment = true;
      adjustmentDirection = -1;
      this.triggerAlert('Frame time exceeds budget', 'critical');
    } else if (this.state.frameTime < this.budget.maxFrameTime * 0.8 && this.state.qualityLevel < 100) {
      needsAdjustment = true;
      adjustmentDirection = 1;
    }

    // Check memory usage
    if (this.state.memoryUsage > this.budget.maxMemoryUsage * 0.9) {
      needsAdjustment = true;
      adjustmentDirection = -1;
      this.triggerAlert('Memory usage approaching limit', 'warning');
    }

    // Check sprite count
    if (this.state.activeSprites > this.budget.maxActiveSprites) {
      this.triggerAlert('Too many active sprites', 'warning');
    }

    // Check draw calls
    if (this.state.drawCalls > this.budget.maxDrawCalls) {
      needsAdjustment = true;
      adjustmentDirection = -1;
      this.triggerAlert('Draw call count exceeds budget', 'warning');
    }

    if (needsAdjustment) {
      this.adjustQuality(adjustmentDirection);
      this.state.lastAdjustment = now;
    }
  }

  private adjustQuality(direction: number): void {
    const step = 10; // Quality adjustment step
    const oldQuality = this.state.qualityLevel;
    
    this.state.qualityLevel = Math.max(10, Math.min(100, this.state.qualityLevel + (direction * step)));
    this.state.isThrottling = this.state.qualityLevel < 100;

    // Apply quality changes to settings
    const qualityRatio = this.state.qualityLevel / 100;
    
    this.qualitySettings.renderScale = Math.max(0.5, Math.min(1.0, 0.5 + (qualityRatio * 0.5)));
    this.qualitySettings.particleDensity = Math.max(0.1, qualityRatio);
    
    if (qualityRatio < 0.3) {
      this.qualitySettings.shadowQuality = 'off';
      this.qualitySettings.postProcessing = false;
      this.qualitySettings.textureFiltering = false;
      this.qualitySettings.audioQuality = 'low';
      this.qualitySettings.maxActiveAudioSources = 2;
    } else if (qualityRatio < 0.6) {
      this.qualitySettings.shadowQuality = 'low';
      this.qualitySettings.postProcessing = false;
      this.qualitySettings.textureFiltering = true;
      this.qualitySettings.audioQuality = 'medium';
      this.qualitySettings.maxActiveAudioSources = 4;
    } else if (qualityRatio < 0.8) {
      this.qualitySettings.shadowQuality = 'medium';
      this.qualitySettings.postProcessing = true;
      this.qualitySettings.textureFiltering = true;
      this.qualitySettings.audioQuality = 'medium';
      this.qualitySettings.maxActiveAudioSources = 6;
    } else {
      this.qualitySettings.shadowQuality = 'high';
      this.qualitySettings.postProcessing = true;
      this.qualitySettings.textureFiltering = true;
      this.qualitySettings.audioQuality = 'high';
      this.qualitySettings.maxActiveAudioSources = 8;
    }

    if (oldQuality !== this.state.qualityLevel) {
      console.log(`Quality adjusted: ${oldQuality} -> ${this.state.qualityLevel}`);
      this.callbacks.onQualityChange?.(this.qualitySettings);
    }
  }

  private triggerAlert(message: string, severity: 'warning' | 'critical'): void {
    console.warn(`Performance Alert [${severity}]: ${message}`);
    this.callbacks.onPerformanceAlert?.(message, severity);
  }

  /**
   * Get current performance state
   */
  getState(): PerformanceState {
    return { ...this.state };
  }

  /**
   * Get current quality settings
   */
  getQualitySettings(): QualitySettings {
    return { ...this.qualitySettings };
  }

  /**
   * Get performance budget
   */
  getBudget(): PerformanceBudget {
    return { ...this.budget };
  }

  /**
   * Manually set quality level (0-100)
   */
  setQualityLevel(level: number): void {
    this.state.qualityLevel = Math.max(0, Math.min(100, level));
    this.adjustQuality(0); // Apply settings without direction change
  }

  /**
   * Enable/disable automatic quality adjustment
   */
  setAutoAdjustment(enabled: boolean): void {
    this.state.isThrottling = !enabled;
  }

  /**
   * Set performance callbacks
   */
  setCallbacks(callbacks: {
    onQualityChange?: (settings: QualitySettings) => void;
    onPerformanceAlert?: (alert: string, severity: 'warning' | 'critical') => void;
  }): void {
    this.callbacks = callbacks;
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): { current: number; average: number; peak: number } {
    const current = this.state.memoryUsage;
    const average = this.memoryHistory.reduce((sum, mem) => sum + mem, 0) / this.memoryHistory.length;
    const peak = Math.max(...this.memoryHistory);

    return { current, average, peak };
  }

  /**
   * Get frame rate statistics
   */
  getFrameStats(): { current: number; average: number; min: number; max: number } {
    const current = this.state.currentFPS;
    const average = this.state.averageFPS;
    const min = Math.min(...this.frameHistory);
    const max = Math.max(...this.frameHistory);

    return { current, average, min, max };
  }

  /**
   * Check if performance is within budget
   */
  isWithinBudget(): boolean {
    return (
      this.state.frameTime <= this.budget.maxFrameTime &&
      this.state.memoryUsage <= this.budget.maxMemoryUsage &&
      this.state.activeSprites <= this.budget.maxActiveSprites &&
      this.state.drawCalls <= this.budget.maxDrawCalls
    );
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    summary: string;
    metrics: PerformanceState;
    budget: PerformanceBudget;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    const withinBudget = this.isWithinBudget();

    if (!withinBudget) {
      if (this.state.frameTime > this.budget.maxFrameTime) {
        recommendations.push('Frame time exceeds budget - consider reducing visual complexity');
      }
      if (this.state.memoryUsage > this.budget.maxMemoryUsage) {
        recommendations.push('Memory usage is high - optimize asset loading and cleanup');
      }
      if (this.state.drawCalls > this.budget.maxDrawCalls) {
        recommendations.push('Too many draw calls - batch sprites or reduce visual elements');
      }
    }

    if (this.state.qualityLevel < 80) {
      recommendations.push('Quality has been automatically reduced - consider optimizing content');
    }

    const summary = withinBudget 
      ? 'Performance is within budget'
      : `Performance issues detected (Quality: ${this.state.qualityLevel}%)`;

    return {
      summary,
      metrics: this.getState(),
      budget: this.getBudget(),
      recommendations
    };
  }

  /**
   * Reset performance monitoring
   */
  reset(): void {
    this.frameHistory = [];
    this.memoryHistory = [];
    this.state.lastAdjustment = 0;
    this.state.isThrottling = false;
    this.state.qualityLevel = 100;
  }

  /**
   * Enable/disable performance monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
}