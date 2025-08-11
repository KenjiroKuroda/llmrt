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
 * Fixed-tick game loop with frame interpolation
 * Maintains deterministic 60Hz game logic updates while allowing smooth rendering
 */
export declare class GameLoop {
    readonly tickRate: number;
    readonly tickInterval: number;
    private _running;
    private _paused;
    private _callbacks;
    private _lastTime;
    private _accumulator;
    private _tickCount;
    private _frameCount;
    private _frameTimeHistory;
    private _lastFpsUpdate;
    private _currentFps;
    private _droppedFrames;
    private _startTime;
    private _rng;
    private _rafHandle;
    constructor(callbacks?: GameLoopCallbacks);
    /**
     * Start the game loop
     */
    start(): void;
    /**
     * Stop the game loop
     */
    stop(): void;
    /**
     * Pause the game loop (stops ticks but continues rendering)
     */
    pause(): void;
    /**
     * Resume the game loop
     */
    resume(): void;
    /**
     * Set callbacks for tick and render events
     */
    setCallbacks(callbacks: GameLoopCallbacks): void;
    /**
     * Get current performance metrics
     */
    getMetrics(): PerformanceMetrics;
    /**
     * Get the deterministic RNG instance
     */
    getRNG(): SeededRNG;
    /**
     * Seed the RNG for deterministic behavior
     */
    seedRNG(seed: number): void;
    /**
     * Get current tick count
     */
    get tickCount(): number;
    /**
     * Get current frame count
     */
    get frameCount(): number;
    /**
     * Check if the loop is running
     */
    get isRunning(): boolean;
    /**
     * Check if the loop is paused
     */
    get isPaused(): boolean;
    /**
     * Main game loop step
     */
    private _gameLoopStep;
    /**
     * Execute a single game logic tick
     */
    private _tick;
    /**
     * Execute a render frame with interpolation
     */
    private _render;
}
//# sourceMappingURL=game-loop.d.ts.map