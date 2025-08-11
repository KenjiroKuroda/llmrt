/**
 * LLM Canvas Engine Playground
 * Interactive development environment for testing and debugging cartridges
 */
export declare class PlaygroundApp {
    private engine;
    private canvas;
    private editor;
    private validationPanel;
    private consolePanel;
    private performanceMetrics;
    private frameTimeChart;
    private memoryChart;
    private isRunning;
    private currentCartridge;
    private assets;
    private performanceMonitorId;
    private profiler;
    private assetManager;
    private buildExporter;
    constructor();
    private initializeEventListeners;
    private initializeDebugTabs;
    private switchDebugTab;
    private setupConsoleCapture;
    private log;
    private loadCartridge;
    private handleFileLoad;
    private loadSample;
    private validateCurrentCartridge;
    private showValidationResult;
    private extractAssets;
    private runCartridge;
    private stopCartridge;
    private resetCartridge;
    private startPerformanceMonitoring;
    private stopPerformanceMonitoring;
    private getMemoryUsage;
    private updatePerformanceCharts;
    private drawFrameTimeChart;
    private drawMemoryChart;
    private updatePerformanceStats;
    private clearPerformanceCharts;
    private updateAssetPreview;
    private updateSceneTree;
    private renderNodeTree;
    private exportBuild;
    private updateButtons;
    private showLoading;
    private resizeCanvas;
    private debounce;
}
//# sourceMappingURL=playground.d.ts.map