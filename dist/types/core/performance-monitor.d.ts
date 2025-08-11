/**
 * Integrated performance monitoring system with automatic quality adjustment
 */
export interface PerformanceBudget {
    maxFrameTime: number;
    maxMemoryUsage: number;
    maxActiveSprites: number;
    maxBillboards: number;
    maxFake3DSurfaces: number;
    maxDrawCalls: number;
    targetFPS: number;
}
export interface QualitySettings {
    renderScale: number;
    particleDensity: number;
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
    qualityLevel: number;
    isThrottling: boolean;
    lastAdjustment: number;
}
export declare class PerformanceMonitor {
    private budget;
    private qualitySettings;
    private state;
    private frameHistory;
    private memoryHistory;
    private adjustmentCooldown;
    private isEnabled;
    private callbacks;
    constructor(budget?: Partial<PerformanceBudget>);
    private detectPlatform;
    private detectLowEndDevice;
    /**
     * Update performance metrics (called each frame)
     */
    updateMetrics(frameTime: number, memoryUsage: number, activeSprites: number, drawCalls: number): void;
    private checkPerformanceThresholds;
    private adjustQuality;
    private triggerAlert;
    /**
     * Get current performance state
     */
    getState(): PerformanceState;
    /**
     * Get current quality settings
     */
    getQualitySettings(): QualitySettings;
    /**
     * Get performance budget
     */
    getBudget(): PerformanceBudget;
    /**
     * Manually set quality level (0-100)
     */
    setQualityLevel(level: number): void;
    /**
     * Enable/disable automatic quality adjustment
     */
    setAutoAdjustment(enabled: boolean): void;
    /**
     * Set performance callbacks
     */
    setCallbacks(callbacks: {
        onQualityChange?: (settings: QualitySettings) => void;
        onPerformanceAlert?: (alert: string, severity: 'warning' | 'critical') => void;
    }): void;
    /**
     * Get memory usage statistics
     */
    getMemoryStats(): {
        current: number;
        average: number;
        peak: number;
    };
    /**
     * Get frame rate statistics
     */
    getFrameStats(): {
        current: number;
        average: number;
        min: number;
        max: number;
    };
    /**
     * Check if performance is within budget
     */
    isWithinBudget(): boolean;
    /**
     * Generate performance report
     */
    generateReport(): {
        summary: string;
        metrics: PerformanceState;
        budget: PerformanceBudget;
        recommendations: string[];
    };
    /**
     * Reset performance monitoring
     */
    reset(): void;
    /**
     * Enable/disable performance monitoring
     */
    setEnabled(enabled: boolean): void;
}
//# sourceMappingURL=performance-monitor.d.ts.map