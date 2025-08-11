/**
 * Performance Profiler for LLM Canvas Engine
 * Provides detailed performance monitoring and analysis
 */
export interface PerformanceMetric {
    name: string;
    value: number;
    unit: string;
    timestamp: number;
    category: 'frame' | 'memory' | 'render' | 'audio' | 'input';
}
export interface PerformanceSnapshot {
    timestamp: number;
    frameTime: number;
    fps: number;
    memoryUsage: number;
    renderTime: number;
    updateTime: number;
    audioLatency: number;
    inputLatency: number;
    activeNodes: number;
    drawCalls: number;
}
export interface PerformanceAlert {
    type: 'warning' | 'critical';
    message: string;
    metric: string;
    value: number;
    threshold: number;
    timestamp: number;
}
export declare class PerformanceProfiler {
    private metrics;
    private snapshots;
    private alerts;
    private isRecording;
    private startTime;
    private frameCount;
    private lastFrameTime;
    private thresholds;
    constructor();
    private setupPerformanceObserver;
    private categorizeEntry;
    startRecording(): void;
    stopRecording(): PerformanceReport;
    recordFrame(frameTime: number): void;
    recordMemoryUsage(): void;
    recordRenderTime(renderTime: number): void;
    recordDrawCalls(count: number): void;
    recordAudioLatency(latency: number): void;
    recordInputLatency(latency: number): void;
    takeSnapshot(): PerformanceSnapshot;
    private recordMetric;
    private checkThresholds;
    private getMemoryUsage;
    private getAverageMetric;
    private getLatestMetric;
    getMetrics(): PerformanceMetric[];
    getSnapshots(): PerformanceSnapshot[];
    getAlerts(): PerformanceAlert[];
    getRecentAlerts(timeWindow?: number): PerformanceAlert[];
    generateReport(): PerformanceReport;
    private calculatePerformanceScore;
    private generateRecommendations;
    setThreshold(metric: string, warning: number, critical: number): void;
    clearData(): void;
    exportData(): string;
}
export interface PerformanceReport {
    duration: number;
    frameCount: number;
    averageFps: number;
    averageFrameTime: number;
    maxMemoryUsage: number;
    totalMetrics: number;
    totalSnapshots: number;
    criticalAlerts: number;
    warningAlerts: number;
    performanceScore: number;
    recommendations: string[];
}
//# sourceMappingURL=performance-profiler.d.ts.map