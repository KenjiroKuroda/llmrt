/**
 * Fixed-tick game loop with interpolation for the LLM Canvas Engine
 * Provides deterministic 60Hz updates with smooth rendering interpolation
 */

export interface GameLoopCallbacks {
  onTick?: (tick: number, deltaTime: number) => void;
  onRender?: (interpolation: number, frameTime: number) => void;
}

export interface PerformanceMetrics {
  fps: number;
  averageFrameTime: number;
  tickRate: number;
  droppedFrames: number;
  totalTicks: number;
  totalFrames: number;
}

export interface SeededRNG {
  seed(value: number): void;
  random(): number;
  randomInt(min: number, max: number): number;
  randomFloat(min: number, max: number): number;
}

/**
 * Seedable pseudo-random number generator using Linear Congruential Generator
 * Provides deterministic random numbers for reproducible gameplay
 */
class DeterministicRNG implements SeededRNG {
  private _seed: number = 1;

  seed(value: number): void {
    this._seed = Math.abs(value) || 1;
  }

  random(): number {
    // LCG formula: (a * seed + c) % m
    // Using values from Numerical Recipes
    this._seed = (this._seed * 1664525 + 1013904223) % 4294967296;
    return this._seed / 4294967296;
  }

  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  randomFloat(min: number, max: number): number {
    return this.random() * (max - min) + min;
  }
}

/**
 * Fixed-tick game loop with frame interpolation
 * Maintains deterministic 60Hz game logic updates while allowing smooth rendering
 */
export class GameLoop {
  public readonly tickRate: number = 60; // 60 Hz fixed tick rate
  public readonly tickInterval: number = 1000 / 60; // ~16.67ms per tick
  
  private _running: boolean = false;
  private _paused: boolean = false;
  private _callbacks: GameLoopCallbacks = {};
  
  // Timing state
  private _lastTime: number = 0;
  private _accumulator: number = 0;
  private _tickCount: number = 0;
  private _frameCount: number = 0;
  
  // Performance tracking
  private _frameTimeHistory: number[] = [];
  private _lastFpsUpdate: number = 0;
  private _currentFps: number = 0;
  private _droppedFrames: number = 0;
  
  // RNG system
  private _rng: DeterministicRNG = new DeterministicRNG();
  
  // Animation frame handle
  private _rafHandle: number | null = null;

  constructor(callbacks?: GameLoopCallbacks) {
    this._callbacks = callbacks || {};
    this._rng.seed(Date.now());
  }

  /**
   * Start the game loop
   */
  start(): void {
    if (this._running) return;
    
    this._running = true;
    this._paused = false;
    this._lastTime = performance.now();
    this._startTime = this._lastTime;
    this._accumulator = 0;
    this._tickCount = 0;
    this._frameCount = 0;
    this._droppedFrames = 0;
    this._frameTimeHistory = [];
    this._lastFpsUpdate = this._lastTime;
    
    this._gameLoopStep();
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    this._running = false;
    this._paused = false;
    
    if (this._rafHandle !== null) {
      cancelAnimationFrame(this._rafHandle);
      this._rafHandle = null;
    }
  }

  /**
   * Pause the game loop (stops ticks but continues rendering)
   */
  pause(): void {
    this._paused = true;
  }

  /**
   * Resume the game loop
   */
  resume(): void {
    if (!this._running) return;
    
    this._paused = false;
    this._lastTime = performance.now();
    this._accumulator = 0; // Reset accumulator to prevent catch-up
  }

  /**
   * Set callbacks for tick and render events
   */
  setCallbacks(callbacks: GameLoopCallbacks): void {
    this._callbacks = { ...this._callbacks, ...callbacks };
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const averageFrameTime = this._frameTimeHistory.length > 0
      ? this._frameTimeHistory.reduce((a, b) => a + b, 0) / this._frameTimeHistory.length
      : 0;

    return {
      fps: this._currentFps,
      averageFrameTime,
      tickRate: this.tickRate,
      droppedFrames: this._droppedFrames,
      totalTicks: this._tickCount,
      totalFrames: this._frameCount
    };
  }

  /**
   * Get the deterministic RNG instance
   */
  getRNG(): SeededRNG {
    return this._rng;
  }

  /**
   * Seed the RNG for deterministic behavior
   */
  seedRNG(seed: number): void {
    this._rng.seed(seed);
  }

  /**
   * Get current tick count
   */
  get tickCount(): number {
    return this._tickCount;
  }

  /**
   * Get current frame count
   */
  get frameCount(): number {
    return this._frameCount;
  }

  /**
   * Check if the loop is running
   */
  get isRunning(): boolean {
    return this._running;
  }

  /**
   * Check if the loop is paused
   */
  get isPaused(): boolean {
    return this._paused;
  }

  /**
   * Main game loop step
   */
  private _gameLoopStep = (): void => {
    if (!this._running) return;

    const currentTime = performance.now();
    const frameTime = currentTime - this._lastTime;
    this._lastTime = currentTime;
    this._frameCount++;

    // Track frame time for performance metrics
    this._frameTimeHistory.push(frameTime);
    if (this._frameTimeHistory.length > 60) {
      this._frameTimeHistory.shift();
    }

    // Update FPS counter every second
    if (currentTime - this._lastFpsUpdate >= 1000) {
      this._currentFps = Math.round(1000 / (this._frameTimeHistory.reduce((a, b) => a + b, 0) / this._frameTimeHistory.length));
      this._lastFpsUpdate = currentTime;
    }

    // Fixed timestep with accumulator
    if (!this._paused) {
      this._accumulator += frameTime;

      // Prevent spiral of death - if we're too far behind, drop frames
      const maxAccumulator = this.tickInterval * 5; // Allow up to 5 ticks per frame
      if (this._accumulator > maxAccumulator) {
        const droppedTime = this._accumulator - maxAccumulator;
        const droppedTicks = Math.floor(droppedTime / this.tickInterval);
        this._droppedFrames += droppedTicks;
        this._accumulator = maxAccumulator;
      }

      // Process fixed timestep updates
      while (this._accumulator >= this.tickInterval) {
        this._tick();
        this._accumulator -= this.tickInterval;
        this._tickCount++;
      }
    }

    // Calculate interpolation factor for smooth rendering
    const interpolation = this._paused ? 0 : this._accumulator / this.tickInterval;

    // Render with interpolation
    this._render(interpolation, frameTime);

    // Schedule next frame
    this._rafHandle = requestAnimationFrame(this._gameLoopStep);
  };

  /**
   * Execute a single game logic tick
   */
  private _tick(): void {
    if (this._callbacks.onTick) {
      this._callbacks.onTick(this._tickCount, this.tickInterval);
    }
  }

  /**
   * Execute a render frame with interpolation
   */
  private _render(interpolation: number, frameTime: number): void {
    if (this._callbacks.onRender) {
      this._callbacks.onRender(interpolation, frameTime);
    }
  }
}